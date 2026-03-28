import OpenAI from 'openai'
import {
  Episode,
  EpisodeQuery,
  ScoredEpisode,
  searchEpisodesSemantic,
  filterEpisodes,
  scoreEpisodeSimilarity,
} from '@/lib/db/episodes'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return response.data[0].embedding
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
 * 1. Parse query into structured filters (heuristic)
 * 2. Generate embedding (OpenAI)
 * 3. Run semantic search + heuristic scoring in parallel
 * 4. Merge results, rank by combined score, return top N
 */
export async function retrieveRelevantEpisodes(
  query: string,
  manualFilters?: Partial<EpisodeQuery>,
  topN = 5
): Promise<RetrievalResult> {
  const parsedFilters = parseQueryFilters(query)
  const effectiveFilters: EpisodeQuery = { ...parsedFilters, ...manualFilters }

  // Run embedding generation and fallback filter in parallel
  const [embedding, fallbackEpisodes] = await Promise.all([
    generateEmbedding(query).catch((err) => {
      console.error('Embedding generation failed:', err)
      return null
    }),
    filterEpisodes({
      multilateral: effectiveFilters.multilateral,
      enforcement_intensity: effectiveFilters.enforcement_intensity,
      limit: 20,
    }),
  ])

  let semanticResults: (Episode & { similarity: number })[] = []
  if (embedding) {
    semanticResults = await searchEpisodesSemantic(embedding, 15, 0.3)
  }

  // Build a unified map: episode_id → scored episode
  const episodeMap = new Map<string, ScoredEpisode>()

  // Add semantic results with their similarity score
  for (const ep of semanticResults) {
    const hScore = scoreEpisodeSimilarity(effectiveFilters, ep)
    const combined = embedding ? ep.similarity * 0.6 + hScore * 0.4 : hScore
    episodeMap.set(ep.episode_id, {
      ...ep,
      heuristic_score: hScore,
      semantic_score: ep.similarity,
      combined_score: combined,
    })
  }

  // Add fallback filter results not already in map
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

  // Sort by combined score descending, return top N
  const ranked = Array.from(episodeMap.values())
    .sort((a, b) => b.combined_score - a.combined_score)
    .slice(0, topN)

  return {
    episodes: ranked,
    query_filters: effectiveFilters,
    embedding_used: embedding !== null,
  }
}
