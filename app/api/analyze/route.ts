import { NextRequest } from 'next/server'
import { retrieveRelevantEpisodes } from '@/lib/agent/retrieve'
import { computeForecast } from '@/lib/agent/forecast'
import { generateNarrative } from '@/lib/claude/narrative'
import { needsResearch, researchEpisode } from '@/lib/agent/research'
import { EpisodeQuery } from '@/lib/db/episodes'
import { saveAnalysis, computeQueryHash, getCachedAnalysisId, fetchAnalysis } from '@/lib/db/analyses'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  let body: { query?: unknown; filters?: unknown }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { query, filters } = body as { query: string; filters?: Partial<EpisodeQuery> }

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'query is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (query.length > 1000) {
    return new Response(JSON.stringify({ error: 'query too long (max 1000 chars)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const trimmedQuery = query.trim()
  const queryHash = computeQueryHash(trimmedQuery, filters as Record<string, unknown>)

  // Cache hit — return stored result immediately without re-running the pipeline
  const cachedId = await getCachedAnalysisId(queryHash)
  if (cachedId) {
    const cached = await fetchAnalysis(cachedId)
    if (cached) {
      const encoder = new TextEncoder()
      const payload = encoder.encode(
        `data: ${JSON.stringify({
          type: 'complete',
          id: cachedId,
          cached: true,
          data: {
            episodes: cached.episodes,
            query_filters: cached.query_filters,
            forecast: cached.forecast,
            narrative: cached.narrative,
          },
        })}\n\n`
      )
      return new Response(
        new ReadableStream({ start(c) { c.enqueue(payload); c.close() } }),
        { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } }
      )
    }
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        // Step 1: Retrieve
        send({ type: 'step', step: 'retrieving', message: 'Searching precedent database…' })
        const retrieval = await retrieveRelevantEpisodes(trimmedQuery, filters, 7)

        // Step 1b: Research fallback
        let episodes = retrieval.episodes
        if (needsResearch(episodes)) {
          send({ type: 'step', step: 'researching', message: 'Researching novel scenario…' })
          const synthesized = await researchEpisode(trimmedQuery)
          if (synthesized) {
            episodes = [synthesized, ...episodes].slice(0, 7)
          }
        }

        // Step 2: Forecast
        send({ type: 'step', step: 'forecasting', message: 'Computing scenario probabilities…' })
        const forecast = computeForecast(episodes)

        // Step 3: Narrative
        send({ type: 'step', step: 'generating', message: 'Generating analytical memo…' })
        const narrative = await generateNarrative(trimmedQuery, episodes, forecast)

        // Step 4: Persist
        send({ type: 'step', step: 'saving', message: 'Saving analysis…' })
        const id = await saveAnalysis({
          query: trimmedQuery,
          query_filters: retrieval.query_filters,
          episodes,
          forecast,
          narrative,
          queryHash,
        })

        send({
          type: 'complete',
          id,
          data: {
            episodes,
            query_filters: retrieval.query_filters,
            forecast,
            narrative,
          },
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('/api/analyze error:', message, err)
        send({ type: 'error', error: message || 'Internal server error' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
