import { NextRequest, NextResponse } from 'next/server'
import { retrieveRelevantEpisodes } from '@/lib/agent/retrieve'
import { computeForecast } from '@/lib/agent/forecast'
import { generateNarrative } from '@/lib/claude/narrative'
import { needsResearch, researchEpisode } from '@/lib/agent/research'
import { EpisodeQuery } from '@/lib/db/episodes'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { query, filters } = body as {
      query: string
      filters?: Partial<EpisodeQuery>
    }

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 })
    }

    if (query.length > 1000) {
      return NextResponse.json({ error: 'query too long (max 1000 chars)' }, { status: 400 })
    }

    // Step 1: Retrieve relevant episodes (semantic + heuristic scoring)
    const retrieval = await retrieveRelevantEpisodes(query.trim(), filters, 7)

    // Step 1b: Research fallback — if retrieval quality is too low, synthesize an episode
    let episodes = retrieval.episodes
    if (needsResearch(episodes)) {
      const synthesized = await researchEpisode(query.trim())
      if (synthesized) {
        // Inject at front, cap total at 7
        episodes = [synthesized, ...episodes].slice(0, 7)
      }
    }

    // Step 2: Compute forecast (pure math from historical outcomes)
    const forecast = computeForecast(episodes)

    // Step 3: Generate narrative (Claude, last step, narrative only)
    const narrative = await generateNarrative(query.trim(), episodes, forecast)

    return NextResponse.json({
      episodes,
      query_filters: retrieval.query_filters,
      forecast,
      narrative,
    })
  } catch (err) {
    console.error('/api/analyze error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
