/**
 * Ingest a new sanctions episode from a URL or raw text.
 * Uses Claude to extract structured fields, OpenAI to embed, Supabase to store.
 *
 * Usage:
 *   npx tsx scripts/ingest-episode.ts --url "https://en.wikipedia.org/wiki/..."
 *   npx tsx scripts/ingest-episode.ts --text "Iran nuclear sanctions were imposed..."
 *   npx tsx scripts/ingest-episode.ts --url "..." --dry-run   (preview without inserting)
 *
 * Requires in .env.local:
 *   ANTHROPIC_API_KEY, OPENAI_API_KEY,
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseArgs(): { url?: string; text?: string; dryRun: boolean } {
  const args = process.argv.slice(2)
  const get = (flag: string) => {
    const i = args.indexOf(flag)
    return i !== -1 && args[i + 1] ? args[i + 1] : undefined
  }
  return {
    url: get('--url'),
    text: get('--text'),
    dryRun: args.includes('--dry-run'),
  }
}

async function fetchUrl(url: string): Promise<string> {
  console.log(`Fetching ${url}...`)
  const res = await fetch(url, { headers: { 'User-Agent': 'sanctions-precedent-ingest/1.0' } })
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
  const html = await res.text()
  // Strip HTML tags, collapse whitespace, truncate to 12k chars for Claude
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12000)
}

function buildEmbeddingText(ep: Record<string, unknown>): string {
  const parts = [
    ep.name,
    ep.target,
    ep.sector,
    ep.trigger_event,
    ep.narrative,
    Array.isArray(ep.goals) ? ep.goals.join('. ') : '',
    Array.isArray(ep.lessons) ? ep.lessons.join('. ') : '',
    Array.isArray(ep.workarounds) ? (ep.workarounds as string[]).slice(0, 3).join('. ') : '',
    Array.isArray(ep.tags) ? ep.tags.join(' ') : '',
  ]
  return parts.filter(Boolean).join('\n').slice(0, 6000)
}

// ─── Claude extraction tool definition ──────────────────────────────────────

const EXTRACTION_TOOL: Anthropic.Tool = {
  name: 'create_episode',
  description: 'Extract a structured sanctions episode record from the provided source text.',
  input_schema: {
    type: 'object' as const,
    required: [
      'episode_id', 'name', 'start_date', 'initiators', 'target', 'sector',
      'goals', 'multilateral', 'un_backed', 'enforcement_intensity', 'measures',
      'workarounds', 'key_turning_points', 'lessons', 'tags', 'narrative',
    ],
    properties: {
      episode_id: {
        type: 'string',
        description: 'Unique ID in format CTRYYYY_KEYWORD e.g. IRN2012_NUCLEAR, RUS2022_ENERGY, VEN2019_OIL',
      },
      name: { type: 'string', description: 'Human-readable episode name e.g. "Iran Nuclear Sanctions 2012"' },
      start_date: { type: 'string', description: 'ISO date YYYY-MM-DD, use YYYY-01-01 if only year known' },
      end_date: { type: ['string', 'null'], description: 'ISO date or null if ongoing' },
      initiators: {
        type: 'array', items: { type: 'string' },
        description: 'Sanctioning parties e.g. ["US", "EU", "UN", "UK"]',
      },
      target: { type: 'string', description: 'Target country or entity name' },
      target_gdp_pct_world: {
        type: ['number', 'null'],
        description: 'Target country GDP as % of world GDP at time of sanctions (e.g. 0.4 for 0.4%)',
      },
      sector: {
        type: 'string',
        enum: ['energy', 'finance', 'defense_nuclear', 'technology', 'comprehensive', 'trade'],
      },
      goals: {
        type: 'array', items: { type: 'string' },
        description: 'What initiators were trying to achieve e.g. ["nuclear programme rollback", "regime change"]',
      },
      multilateral: { type: 'boolean', description: 'True if more than one country/bloc initiated' },
      un_backed: { type: 'boolean', description: 'True if UN Security Council resolution supported the sanctions' },
      enforcement_intensity: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'critical'],
        description: 'low=travel bans/asset freezes, medium=sectoral, high=broad sectoral, critical=SWIFT/comprehensive',
      },
      measures: {
        type: 'array', items: { type: 'string' },
        description: 'Specific instruments used e.g. ["oil export ban", "SWIFT exclusion", "central bank asset freeze"]',
      },
      trigger_event: {
        type: ['string', 'null'],
        description: 'The specific event that triggered the sanctions',
      },
      workarounds: {
        type: 'array', items: { type: 'string' },
        description: 'How the target evaded or adapted to sanctions',
      },
      target_economy: {
        type: ['object', 'null'],
        properties: {
          gdp_change_pct: { type: ['number', 'null'] },
          oil_export_change_pct: { type: ['number', 'null'] },
          inflation_pct: { type: ['number', 'null'] },
          currency_devaluation_pct: { type: ['number', 'null'] },
          alternative_partners: { type: 'array', items: { type: 'string' } },
        },
      },
      outcome: { type: ['string', 'null'], description: 'Brief outcome description' },
      objective_achieved: {
        type: ['string', 'null'],
        enum: ['yes', 'partial', 'no', 'backfire', null],
      },
      success_score: {
        type: ['number', 'null'],
        description: '0.0 to 1.0 — how much the initiators achieved their stated goals',
      },
      time_to_impact_months: { type: ['number', 'null'], description: 'Months until measurable economic impact' },
      time_to_resolution_months: { type: ['number', 'null'], description: 'Months until resolution or null if ongoing' },
      key_turning_points: {
        type: 'array', items: { type: 'string' },
        description: 'Specific events that changed the trajectory of the sanctions episode',
      },
      resolution: { type: ['string', 'null'], description: 'How the episode ended, or null if unresolved' },
      lessons: {
        type: 'array', items: { type: 'string' },
        description: 'Analytical lessons for future sanctions design or prediction',
      },
      tags: {
        type: 'array', items: { type: 'string' },
        description: 'Keywords e.g. ["petrostate", "nuclear", "third-party evasion", "energy dependence"]',
      },
      key_sources: {
        type: 'array', items: { type: 'string' },
        description: 'Source URLs or citation strings',
      },
      wikipedia_url: { type: ['string', 'null'] },
      narrative: {
        type: 'string',
        description: '3-4 paragraph analytical narrative covering: context and trigger, measures and target response, key turning points, outcome and lessons. This will be embedded for semantic search — make it rich and specific.',
      },
    },
  },
}

// ─── Claude extraction ───────────────────────────────────────────────────────

async function extractEpisode(sourceText: string, sourceUrl?: string): Promise<Record<string, unknown>> {
  console.log('Extracting episode structure with Claude...')

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    tools: [EXTRACTION_TOOL],
    tool_choice: { type: 'any' },
    messages: [
      {
        role: 'user',
        content:
          `Extract a complete sanctions episode record from the following source text. ` +
          `Be precise and evidence-based — only include what is supported by the source. ` +
          `For the narrative field, write a rich 3-4 paragraph analytical summary optimised for semantic search. ` +
          (sourceUrl ? `\n\nSource URL: ${sourceUrl}\n\n` : '\n\n') +
          `Source text:\n${sourceText}`,
      },
    ],
  })

  const toolUse = msg.content.find(b => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Claude did not return a tool_use block')
  }

  return toolUse.input as Record<string, unknown>
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const { url, text, dryRun } = parseArgs()

  if (!url && !text) {
    console.error('Error: provide --url <url> or --text <text>')
    process.exit(1)
  }

  // 1. Get source text
  const sourceText = url ? await fetchUrl(url) : text!

  // 2. Extract structured episode with Claude
  const episode = await extractEpisode(sourceText, url)

  console.log('\n─── Extracted Episode ───────────────────────────────')
  console.log(`ID:        ${episode.episode_id}`)
  console.log(`Name:      ${episode.name}`)
  console.log(`Target:    ${episode.target}`)
  console.log(`Initiators:${(episode.initiators as string[]).join(', ')}`)
  console.log(`Sector:    ${episode.sector}`)
  console.log(`Intensity: ${episode.enforcement_intensity}`)
  console.log(`Achieved:  ${episode.objective_achieved ?? 'N/A'}`)
  console.log(`Start:     ${episode.start_date}`)
  console.log(`Narrative: ${(episode.narrative as string).slice(0, 200)}...`)
  console.log('─────────────────────────────────────────────────────\n')

  if (dryRun) {
    console.log('Dry run — skipping database insert.')
    console.log('Full episode JSON:')
    console.log(JSON.stringify(episode, null, 2))
    return
  }

  // 3. Check for duplicate episode_id
  const { data: existing } = await supabase
    .from('episodes')
    .select('episode_id')
    .eq('episode_id', episode.episode_id)
    .single()

  if (existing) {
    console.error(`Error: episode_id "${episode.episode_id}" already exists in the database.`)
    console.error('Use a different --url/--text or manually change the episode_id.')
    process.exit(1)
  }

  // 4. Generate embedding
  console.log('Generating embedding...')
  const embeddingText = buildEmbeddingText(episode)
  const embeddingRes = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: embeddingText,
  })
  const embedding = embeddingRes.data[0].embedding

  // 5. Insert into Supabase
  console.log('Inserting into Supabase...')
  const { error } = await supabase
    .from('episodes')
    .insert({ ...episode, embedding })

  if (error) {
    console.error('Insert failed:', error.message)
    process.exit(1)
  }

  console.log(`\n✓ Episode "${episode.episode_id}" ingested successfully.`)
  console.log(`  Run "npx tsx scripts/generate-embeddings.ts" if you need to re-embed in bulk.`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
