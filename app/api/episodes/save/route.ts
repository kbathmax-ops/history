import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, ScoredEpisode } from '@/lib/db/episodes'

function checkAuth(req: NextRequest): boolean {
  const secret = req.headers.get('x-admin-secret')
  return !!process.env.ADMIN_SECRET && secret === process.env.ADMIN_SECRET
}

function buildEpisodeData(episode: ScoredEpisode): Record<string, unknown> {
  return {
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
}

export async function POST(req: NextRequest) {
  try {
    const episode = await req.json() as ScoredEpisode

    if (!episode.episode_id || !episode.name || !episode.target) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const isSynthesized = episode.episode_id.startsWith('SYN_')

    // Synthesized (AI-generated) episodes go to pending_cases for admin review.
    // No auth required — the admin review step is the gate.
    if (isSynthesized) {
      // Check for duplicate pending case
      const { data: existingPending } = await getSupabase()
        .from('pending_cases')
        .select('id')
        .eq('episode_data->>episode_id', episode.episode_id)
        .single()

      if (existingPending) {
        return NextResponse.json({ error: 'Already submitted for review' }, { status: 409 })
      }

      const { error } = await getSupabase()
        .from('pending_cases')
        .insert({
          episode_data: buildEpisodeData(episode),
          query: episode.name,
        })

      if (error) {
        console.error('/api/episodes/save pending error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ ok: true, episode_id: episode.episode_id, status: 'pending_review' })
    }

    // Non-synthesized episodes: admin-only, write directly to episodes
    if (!checkAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: existing } = await getSupabase()
      .from('episodes')
      .select('episode_id')
      .eq('episode_id', episode.episode_id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Episode already exists in database' }, { status: 409 })
    }

    const { error } = await getSupabase()
      .from('episodes')
      .insert(buildEpisodeData(episode))

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
