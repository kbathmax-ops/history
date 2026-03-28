import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabase } from '@/lib/db/episodes'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function checkAuth(req: NextRequest): boolean {
  const secret = req.headers.get('x-admin-secret')
  return secret === process.env.ADMIN_SECRET && !!process.env.ADMIN_SECRET
}

function buildEmbeddingText(ep: Record<string, unknown>): string {
  const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]).join('. ') : '')
  const parts = [
    ep.name,
    ep.target,
    ep.sector,
    ep.trigger_event,
    ep.narrative,
    arr(ep.goals),
    arr(ep.lessons),
    Array.isArray(ep.workarounds) ? (ep.workarounds as string[]).slice(0, 3).join('. ') : '',
    arr(ep.tags),
  ]
  return parts.filter(Boolean).join('\n').slice(0, 6000)
}

// GET /api/admin — list pending cases
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('pending_cases')
    .select('id, query, created_at, episode_data')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ pending: data ?? [] })
}

// PATCH /api/admin — approve or reject a pending case
export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, action } = await req.json()

  if (!id || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'id and action (approve|reject) required' }, { status: 400 })
  }

  // Fetch the pending case
  const { data: pending, error: fetchError } = await supabase
    .from('pending_cases')
    .select('episode_data')
    .eq('id', id)
    .single()

  if (fetchError || !pending) {
    return NextResponse.json({ error: 'Pending case not found' }, { status: 404 })
  }

  if (action === 'reject') {
    const { error: delError } = await supabase.from('pending_cases').delete().eq('id', id)
    if (delError) return NextResponse.json({ error: delError.message }, { status: 500 })
    return NextResponse.json({ message: 'Case rejected and removed' })
  }

  // Approve: generate embedding, insert into episodes, remove from pending
  const ep = pending.episode_data as Record<string, unknown>

  const embeddingText = buildEmbeddingText(ep)
  const embeddingRes = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: embeddingText,
  })
  const embedding = embeddingRes.data[0].embedding

  const { error: insertError } = await supabase.from('episodes').insert({
    ...ep,
    embedding,
  })

  if (insertError) {
    console.error('Insert error:', insertError)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const { error: delError } = await supabase.from('pending_cases').delete().eq('id', id)
  if (delError) console.error('Failed to delete pending case:', delError)

  return NextResponse.json({ message: 'Case approved and added to episodes', episode_id: ep.episode_id })
}
