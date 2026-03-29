import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import {
  Episode,
  EpisodeQuery,
  ScoredEpisode,
  searchEpisodesSemantic,
  filterEpisodes,
  scoreEpisodeSimilarity,
} from '@/lib/db/episodes'

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
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 140,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You are a sanctions database. Given a scenario query, write a 2-sentence description of a real historical sanctions episode that is structurally analogous. ' +
            'Format: "[Initiators] imposed [specific measures] on [target] in [approximate year] following [trigger]. ' +
            'The sanctions [outcome description], with [key dynamic or workaround] determining the result."',
        },
        { role: 'user', content: query },
      ],
    })
    return response.choices[0].message.content ?? query
  } catch {
    return query
  }
}

/**
 * Multi-Query Generation.
 * Generates 3 structural variants of the query, each emphasizing a different
 * dimension: (1) the economic mechanism, (2) the geopolitical coalition structure,
 * (3) the target's evasion/workaround strategy.
 * Broader retrieval net catches episodes using different terminology for the
 * same underlying scenario type.
 */
async function generateQueryVariants(query: string): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 220,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content:
            'Generate exactly 3 alternative phrasings of this sanctions scenario query. ' +
            'Each must emphasize a different structural dimension:\n' +
            '1. The specific economic mechanism (oil embargo, SWIFT exclusion, asset freeze, export control)\n' +
            '2. The geopolitical coalition structure and third-party dynamics\n' +
            '3. The target country\'s likely evasion or workaround strategy\n' +
            'Return exactly 3 lines, no numbering, no bullets, no extra text.',
        },
        { role: 'user', content: query },
      ],
    })
    return (response.choices[0].message.content ?? '')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 10)
      .slice(0, 3)
  } catch {
    return []
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
    // Graceful fallback: return top N by existing score
    return candidates.slice(0, topN)
  }
}

/**
 * Parses a natural language query to extract structured EpisodeQuery filters.
 * Pure heuristics — no AI.
 */
function parseQueryFilters(query: string): EpisodeQuery {
  const q = query.toLowerCase()
  const filters: EpisodeQuery = {}

  // Multilateral signal
  if (q.includes('unilateral') || q.includes('us alone') || q.includes('single country')) {
    filters.multilateral = false
  } else if (
    q.includes('multilateral') ||
    q.includes('coalition') ||
    q.includes('allied') ||
    q.includes('g7') ||
    q.includes('eu and us') ||
    q.includes('un sanctions')
  ) {
    filters.multilateral = true
  }

  // Sector signal
  if (q.includes('oil') || q.includes('energy') || q.includes('gas') || q.includes('petroleum')) {
    filters.sector = 'energy'
  } else if (q.includes('nuclear') || q.includes('weapon') || q.includes('arms') || q.includes('defense')) {
    filters.sector = 'defense_nuclear'
  } else if (q.includes('finance') || q.includes('bank') || q.includes('swift') || q.includes('financial')) {
    filters.sector = 'finance'
  } else if (q.includes('tech') || q.includes('semiconductor') || q.includes('chip') || q.includes('export control')) {
    filters.sector = 'technology'
  }

  // Enforcement intensity signal
  if (
    q.includes('comprehensive') ||
    q.includes('total embargo') ||
    q.includes('maximum pressure') ||
    q.includes('swift ban') ||
    q.includes('full embargo')
  ) {
    filters.enforcement_intensity = 'critical'
  } else if (
    q.includes('sectoral') ||
    q.includes('targeted sector') ||
    q.includes('broad sanctions')
  ) {
    filters.enforcement_intensity = 'high'
  } else if (q.includes('targeted') || q.includes('individual') || q.includes('travel ban')) {
    filters.enforcement_intensity = 'medium'
  }

  // Initiator signals
  const initiators: string[] = []
  if (q.includes(' us ') || q.includes('united states') || q.includes('american') || q.includes('washington')) {
    initiators.push('US')
  }
  if (q.includes(' eu ') || q.includes('europe') || q.includes('european union')) {
    initiators.push('EU')
  }
  if (q.includes(' un ') || q.includes('united nations') || q.includes('security council')) {
    initiators.push('UN')
  }
  if (q.includes(' uk ') || q.includes('britain') || q.includes('british')) {
    initiators.push('UK')
  }
  if (initiators.length > 0) {
    filters.initiators = initiators
  }

  return filters
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
 *   1. Parse structured filters from query (heuristic)
 *   2. Generate 3 query variants + run heuristic filter in parallel
 *   3. HyDE-expand all 4 queries in parallel
 *   4. Embed all 4 HyDE texts in parallel
 *   5. Semantic search for all 4 embeddings in parallel
 *   6. Merge into unified episodeMap (best score wins per episode)
 *
 * Stage 2 — Precision reranking:
 *   7. Pre-sort, take top 15 candidates
 *   8. Cross-encoder rerank with Claude Haiku → return top N
 */
export async function retrieveRelevantEpisodes(
  query: string,
  manualFilters?: Partial<EpisodeQuery>,
  topN = 7
): Promise<RetrievalResult> {
  const parsedFilters = parseQueryFilters(query)
  const effectiveFilters: EpisodeQuery = { ...parsedFilters, ...manualFilters }

  // Stage 1a: Query variants + heuristic filter in parallel
  const [variants, fallbackEpisodes] = await Promise.all([
    generateQueryVariants(query),
    filterEpisodes({
      multilateral: effectiveFilters.multilateral,
      enforcement_intensity: effectiveFilters.enforcement_intensity,
      limit: 20,
    }),
  ])

  const allQueries = [query, ...variants]

  // Stage 1b: HyDE-expand all queries in parallel
  const hydeTexts = await Promise.all(allQueries.map(q => generateHyDE(q)))

  // Stage 1c: Embed all HyDE texts in parallel
  const embeddings = await Promise.all(
    hydeTexts.map(text => generateEmbedding(text).catch(() => null))
  )

  // Stage 1d: Semantic search for each embedding in parallel
  const semanticResultSets = await Promise.all(
    embeddings.map(emb =>
      emb ? searchEpisodesSemantic(emb, 18, 0.35) : Promise.resolve([])
    )
  )

  // Stage 1e: Merge — keep best combined score per episode across all queries
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
