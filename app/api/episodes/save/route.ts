import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { ScoredEpisode } from '@/lib/db/episodes'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

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
  try {
    const episode = await req.json() as ScoredEpisode

    if (!episode.episode_id || !episode.name || !episode.target) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check for duplicate
    const { data: existing } = await supabase
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

    // Strip client-only scoring fields before insert
    const { heuristic_score, semantic_score, combined_score, synthesized, ...dbEpisode } = episode

    const { error } = await supabase
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
