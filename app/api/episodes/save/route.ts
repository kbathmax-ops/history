import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getSupabase, ScoredEpisode } from '@/lib/db/episodes'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function checkAuth(req: NextRequest): boolean {
  const secret = req.headers.get('x-admin-secret')
  return !!process.env.ADMIN_SECRET && secret === process.env.ADMIN_SECRET
}

function buildEmbeddingText(ep: Partial<ScoredEpisode>): string {
  const parts = [
    ep.name,
    ep.target,
    ep.sector,
    ep.trigger_event,
    ep.narrative,
    Array.isArray(ep.goals) ? ep.goals.join('. ') : '',
    Array.isArray(ep.lessons) ? ep.lessons.join('. ') : '',
    Array.isArray(ep.workarounds) ? ep.workarounds.slice(0, 3).join('. ') : '',
    Array.isArray(ep.tags) ? ep.tags.join(' ') : '',
  ]
  return parts.filter(Boolean).join('\n').slice(0, 6000)
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const episode = await req.json() as ScoredEpisode

    if (!episode.episode_id || !episode.name || !episode.target) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check for duplicate
    const { data: existing } = await getSupabase()
      .from('episodes')
      .select('episode_id')
      .eq('episode_id', episode.episode_id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Episode already exists in database' }, { status: 409 })
    }

    // Generate fresh embedding server-side
    const embeddingText = buildEmbeddingText(episode)
    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: embeddingText,
    })
    const embedding = embeddingRes.data[0].embedding

    // Whitelist only known DB columns — never spread untrusted input directly
    const dbEpisode = {
      episode_id: episode.episode_id,
      name: episode.name,
      start_date: episode.start_date,
      end_date: episode.end_date ?? null,
      initiators: episode.initiators ?? [],
      target: episode.target,
      target_gdp_pct_world: episode.target_gdp_pct_world ?? null,
      sector: episode.sector,
      goals: episode.goals ?? [],
      multilateral: episode.multilateral ?? false,
      un_backed: episode.un_backed ?? false,
      enforcement_intensity: episode.enforcement_intensity,
      measures: episode.measures ?? [],
      trigger_event: episode.trigger_event ?? null,
      workarounds: episode.workarounds ?? [],
      target_economy: episode.target_economy ?? null,
      outcome: episode.outcome ?? null,
      objective_achieved: episode.objective_achieved ?? null,
      outcomes_6mo: episode.outcomes_6mo ?? null,
      outcomes_12mo: episode.outcomes_12mo ?? null,
      success_score: episode.success_score ?? null,
      time_to_impact_months: episode.time_to_impact_months ?? null,
      time_to_resolution_months: episode.time_to_resolution_months ?? null,
      key_turning_points: episode.key_turning_points ?? [],
      resolution: episode.resolution ?? null,
      lessons: episode.lessons ?? [],
      tags: episode.tags ?? [],
      key_sources: episode.key_sources ?? [],
      wikipedia_url: episode.wikipedia_url ?? null,
      narrative: episode.narrative ?? null,
    }

    const { error } = await getSupabase()
      .from('episodes')
      .insert({ ...dbEpisode, embedding })

    if (error) {
      console.error('/api/episodes/save error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, episode_id: episode.episode_id })
  } catch (err) {
    console.error('/api/episodes/save error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
