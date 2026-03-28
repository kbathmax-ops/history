/**
 * One-time script to populate the embedding column for all episodes.
 * Run with: npx tsx scripts/generate-embeddings.ts
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY
 * in .env.local
 */

import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return response.data[0].embedding
}

function buildEmbeddingText(episode: Record<string, unknown>): string {
  const parts = [
    episode.name,
    episode.target,
    episode.sector,
    episode.trigger_event,
    episode.narrative,
    Array.isArray(episode.goals) ? episode.goals.join('. ') : '',
    Array.isArray(episode.lessons) ? episode.lessons.join('. ') : '',
    Array.isArray(episode.workarounds) ? episode.workarounds.slice(0, 3).join('. ') : '',
    Array.isArray(episode.tags) ? episode.tags.join(' ') : '',
  ]
  return parts.filter(Boolean).join('\n').slice(0, 6000)
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  console.log('Fetching episodes without embeddings...')

  const { data: episodes, error } = await supabase
    .from('episodes')
    .select('episode_id, name, target, sector, trigger_event, narrative, goals, lessons, workarounds, tags')
    .is('embedding', null)

  if (error) {
    console.error('Failed to fetch episodes:', error)
    process.exit(1)
  }

  if (!episodes || episodes.length === 0) {
    console.log('All episodes already have embeddings.')
    return
  }

  console.log(`Generating embeddings for ${episodes.length} episodes...`)

  let success = 0
  let failed = 0

  for (const ep of episodes) {
    try {
      const text = buildEmbeddingText(ep as Record<string, unknown>)
      const embedding = await generateEmbedding(text)

      const { error: updateError } = await supabase
        .from('episodes')
        .update({ embedding })
        .eq('episode_id', ep.episode_id)

      if (updateError) {
        console.error(`  Failed to update ${ep.episode_id}:`, updateError.message)
        failed++
      } else {
        console.log(`  [OK] ${ep.episode_id}`)
        success++
      }

      // Rate limit: max 3 requests/second for text-embedding-3-small
      await sleep(400)
    } catch (err) {
      console.error(`  [ERROR] ${ep.episode_id}:`, err)
      failed++
    }
  }

  console.log(`\nDone. ${success} succeeded, ${failed} failed.`)
}

main()
