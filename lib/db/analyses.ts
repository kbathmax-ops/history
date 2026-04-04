import { createHash } from 'crypto'
import { getSupabase } from './episodes'
import { ScoredEpisode, EpisodeQuery } from './episodes'
import { ForecastResult } from '@/lib/agent/forecast'
import { NarrativeResult } from '@/lib/claude/narrative'

export interface SavedAnalysis {
  id: string
  query: string
  query_filters: EpisodeQuery
  episodes: ScoredEpisode[]
  forecast: ForecastResult
  narrative: NarrativeResult
  created_at: string
}

/**
 * Stable hash over query + filters for cache lookups.
 * Sorts filter keys so {"a":1,"b":2} and {"b":2,"a":1} produce the same hash.
 */
export function computeQueryHash(query: string, filters?: Record<string, unknown>): string {
  const canonical =
    query.toLowerCase().trim() +
    '|' +
    JSON.stringify(Object.fromEntries(Object.entries(filters ?? {}).sort()))
  return createHash('sha256').update(canonical).digest('hex')
}

/**
 * Returns the id of the most-recent cached analysis for this hash, or null.
 */
export async function getCachedAnalysisId(hash: string): Promise<string | null> {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('saved_analyses')
    .select('id')
    .eq('query_hash', hash)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  return (data as { id: string } | null)?.id ?? null
}

export async function saveAnalysis(data: {
  query: string
  query_filters: EpisodeQuery
  episodes: ScoredEpisode[]
  forecast: ForecastResult
  narrative: NarrativeResult
  queryHash: string
}): Promise<string> {
  const supabase = getSupabase()

  // Strip embeddings — they're large and not needed in saved results
  const episodes = data.episodes.map(({ embedding: _emb, ...ep }) => ep)

  const { data: row, error } = await supabase
    .from('saved_analyses')
    .insert({
      query: data.query,
      query_filters: data.query_filters,
      episodes,
      forecast: data.forecast,
      narrative: data.narrative,
      query_hash: data.queryHash,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return row.id as string
}

export async function fetchAnalysis(id: string): Promise<SavedAnalysis | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('saved_analyses')
    .select('id, query, query_filters, episodes, forecast, narrative, created_at')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as SavedAnalysis
}
