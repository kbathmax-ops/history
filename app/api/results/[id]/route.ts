import { NextRequest, NextResponse } from 'next/server'
import { fetchAnalysis } from '@/lib/db/analyses'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  const analysis = await fetchAnalysis(id)
  if (!analysis) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(analysis)
}
