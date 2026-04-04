import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import {
  EpisodeQuery,
  ScoredEpisode,
  searchEpisodesSemantic,
  filterEpisodes,
  scoreEpisodeSimilarity,
} from '@/lib/db/episodes'

// OpenAI is kept only for text-embedding-3-small (no Anthropic embedding model available)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return response.data[0].embedding
}

/**
 * HyDE — Hypothetical Document Embedding.
 * Converts a query into a hypothetical episode narrative that lives in the
 * same embedding space as stored episodes, improving semantic recall.
 */
async function generateHyDE(query: string): Promise<string> {
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 140,
      messages: [
        {
          role: 'user',
          content:
            'You are a sanctions database. Given a scenario query, write a 2-sentence description of a real historical sanctions episode that is structurally analogous.\n' +
            'Format: "[Initiators] imposed [specific measures] on [target] in [approximate year] following [trigger]. ' +
            'The sanctions [outcome description], with [key dynamic or workaround] determining the result."\n\n' +
            `Query: ${query}`,
        },
      ],
    })
    return msg.content[0].type === 'text' ? msg.content[0].text : query
  } catch {
    return query
  }
}

/**
 * Multi-Query Generation.
 * Generates 3 structural variants of the query, each emphasizing a different
 * dimension: (1) the economic mechanism, (2) the geopolitical coalition structure,
 * (3) the target's evasion/workaround strategy.
 */
async function generateQueryVariants(query: string): Promise<string[]> {
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 220,
      messages: [
        {
          role: 'user',
          content:
            'Generate exactly 3 alternative phrasings of this sanctions scenario query.\n' +
            'Each must emphasize a different structural dimension:\n' +
            '1. The specific economic mechanism (oil embargo, SWIFT exclusion, asset freeze, export control)\n' +
            '2. The geopolitical coalition structure and third-party dynamics\n' +
            "3. The target country's likely evasion or workaround strategy\n" +
            'Return exactly 3 lines, no numbering, no bullets, no extra text.\n\n' +
            `Query: ${query}`,
        },
      ],
    })
    return (msg.content[0].type === 'text' ? msg.content[0].text : '')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 10)
      .slice(0, 3)
  } catch {
    return []
  }
}

/**
 * LLM-based structured filter extraction.
 * Runs in parallel with generateQueryVariants — adds ~same latency as before
 * but understands nuance that keyword matching misses (e.g. multi-sector queries,
 * implied coalition structure, intensity inference from context).
 * Falls back to empty filters on any error.
 */
async function parseQueryFilters(query: string): Promise<EpisodeQuery> {
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [
        {
          role: 'user',
          content:
            'Extract structured filters from this sanctions scenario. Return ONLY a JSON object with these optional fields:\n' +
            '- "multilateral": true or false (omit if genuinely ambiguous)\n' +
            '- "sector": one of "energy","finance","defense_nuclear","technology","comprehensive","trade","energy_finance" (omit if mixed or unclear)\n' +
            '- "enforcement_intensity": one of "low","medium","high","critical" (omit if unclear)\n' +
            '- "initiators": array like ["US","EU","UN","UK"] (include only when explicitly named)\n\n' +
            `Scenario: ${query}\n\nReturn only the JSON object.`,
        },
      ],
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '{}'
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return {}

    const parsed = JSON.parse(jsonMatch[0])
    const result: EpisodeQuery = {}

    if (typeof parsed.multilateral === 'boolean') {
      result.multilateral = parsed.multilateral
    }
    const validSectors = ['energy', 'finance', 'defense_nuclear', 'technology', 'comprehensive', 'trade', 'energy_finance']
    if (typeof parsed.sector === 'string' && validSectors.includes(parsed.sector)) {
      result.sector = parsed.sector
    }
    const validIntensities = ['low', 'medium', 'high', 'critical'] as const
    if (typeof parsed.enforcement_intensity === 'string' && (validIntensities as readonly string[]).includes(parsed.enforcement_intensity)) {
      result.enforcement_intensity = parsed.enforcement_intensity as typeof validIntensities[number]
    }
    if (Array.isArray(parsed.initiators)) {
      result.initiators = parsed.initiators.filter((i: unknown): i is string => typeof i === 'string')
    }

    return result
  } catch {
    return {}
  }
}

/**
 * Cross-Encoder Reranking.
 * Uses Claude Haiku to score each candidate episode on structural relevance
 * to the original query across 4 dimensions: sector match, initiator coalition
 * profile, enforcement mechanism, workaround type similarity.
 * Blends the Claude score (60%) with the existing combined score (40%) to
 * produce a final ranking.
 */
async function rerankWithClaude(
  query: string,
  candidates: ScoredEpisode[],
  topN: number
): Promise<ScoredEpisode[]> {
  if (candidates.length <= topN) return candidates

  try {
    const episodeList = candidates
      .map(
        (ep, i) =>
          `[${i}] ${ep.episode_id} | ${ep.name} (${ep.start_date.slice(0, 4)}) | ` +
          `sector:${ep.sector} | initiators:${ep.initiators.join('+')} | ` +
          `intensity:${ep.enforcement_intensity} | achieved:${ep.objective_achieved ?? 'N/A'} | ` +
          `workarounds:${ep.workarounds.slice(0, 2).join('; ')}`
      )
      .join('\n')

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [
        {
          role: 'user',
          content:
            `Rank these historical sanctions episodes for structural relevance to the query.\n\n` +
            `Query: "${query}"\n\n` +
            `Episodes:\n${episodeList}\n\n` +
            `Score each episode 0-10 on structural relevance. Consider: ` +
            `(1) sector and instrument match, (2) initiator coalition profile, ` +
            `(3) enforcement intensity level, (4) workaround type similarity.\n` +
            `Return ONLY a JSON array: [{"i":0,"s":8},{"i":1,"s":5},...] for all ${candidates.length} episodes.`,
        },
      ],
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const jsonMatch = text.match(/\[[\s\S]*?\]/)
    if (!jsonMatch) return candidates.slice(0, topN)

    const scores: { i: number; s: number }[] = JSON.parse(jsonMatch[0])
    const scoreMap = new Map(scores.map(({ i, s }) => [i, s]))

    return candidates
      .map((ep, i) => ({
        ...ep,
        // 60% Claude structural score + 40% existing combined (semantic + heuristic)
        combined_score: ((scoreMap.get(i) ?? 5) / 10) * 0.6 + ep.combined_score * 0.4,
      }))
      .sort((a, b) => b.combined_score - a.combined_score)
      .slice(0, topN)
  } catch {
    return candidates.slice(0, topN)
  }
}

export interface RetrievalResult {
  episodes: ScoredEpisode[]
  query_filters: EpisodeQuery
  embedding_used: boolean
}

/**
 * Main retrieval pipeline.
 *
 * Stage 1 — Broad retrieval (multi-query + HyDE):
 *   1. Parse structured filters with Haiku + generate query variants (parallel)
 *   2. HyDE-expand all 4 queries in parallel
 *   3. Embed all 4 HyDE texts in parallel
 *   4. Semantic search for all 4 embeddings in parallel
 *   5. Merge into unified episodeMap (best score wins per episode)
 *
 * Stage 2 — Precision reranking:
 *   6. Pre-sort, take top 15 candidates
 *   7. Cross-encoder rerank with Claude Haiku → return top N
 */
export async function retrieveRelevantEpisodes(
  query: string,
  manualFilters?: Partial<EpisodeQuery>,
  topN = 7
): Promise<RetrievalResult> {
  // Stage 1a: LLM filter parsing + query variants in parallel (both use Haiku)
  const [parsedFilters, variants] = await Promise.all([
    parseQueryFilters(query),
    generateQueryVariants(query),
  ])

  const effectiveFilters: EpisodeQuery = { ...parsedFilters, ...manualFilters }

  // Stage 1b: Heuristic DB filter (fast, depends on effectiveFilters)
  const fallbackEpisodes = await filterEpisodes({
    multilateral: effectiveFilters.multilateral,
    enforcement_intensity: effectiveFilters.enforcement_intensity,
    limit: 20,
  })

  const allQueries = [query, ...variants]

  // Stage 1c: HyDE-expand all queries in parallel
  const hydeTexts = await Promise.all(allQueries.map(q => generateHyDE(q)))

  // Stage 1d: Embed all HyDE texts in parallel
  const embeddings = await Promise.all(
    hydeTexts.map(text => generateEmbedding(text).catch(() => null))
  )

  // Stage 1e: Semantic search for each embedding in parallel
  const semanticResultSets = await Promise.all(
    embeddings.map(emb =>
      emb ? searchEpisodesSemantic(emb, 18, 0.35) : Promise.resolve([])
    )
  )

  // Stage 1f: Merge — keep best combined score per episode across all queries
  const episodeMap = new Map<string, ScoredEpisode>()

  for (const results of semanticResultSets) {
    for (const ep of results) {
      const hScore = scoreEpisodeSimilarity(effectiveFilters, ep)
      const combined = ep.similarity * 0.6 + hScore * 0.4
      const existing = episodeMap.get(ep.episode_id)
      if (!existing || combined > existing.combined_score) {
        episodeMap.set(ep.episode_id, {
          ...ep,
          heuristic_score: hScore,
          semantic_score: ep.similarity,
          combined_score: combined,
        })
      }
    }
  }

  // Add heuristic-only fallback results not found semantically
  for (const ep of fallbackEpisodes) {
    if (!episodeMap.has(ep.episode_id)) {
      const hScore = scoreEpisodeSimilarity(effectiveFilters, ep)
      episodeMap.set(ep.episode_id, {
        ...ep,
        heuristic_score: hScore,
        semantic_score: undefined,
        combined_score: hScore,
      })
    }
  }

  // Stage 2: Pre-sort → top 15 candidates → cross-encoder rerank → top N
  const candidates = Array.from(episodeMap.values())
    .sort((a, b) => b.combined_score - a.combined_score)
    .slice(0, 15)

  const reranked = await rerankWithClaude(query, candidates, topN)

  return {
    episodes: reranked,
    query_filters: effectiveFilters,
    embedding_used: embeddings[0] !== null,
  }
}
