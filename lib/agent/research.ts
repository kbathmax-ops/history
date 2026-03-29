/**
 * Research fallback — when retrieval quality is too low to be useful,
 * use Claude's training knowledge to synthesize a historically-grounded
 * episode record for the scenario.
 *
 * Synthesized episodes are ephemeral (not persisted to the DB) and are
 * flagged with `synthesized: true` so the UI can distinguish them.
 */

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { ScoredEpisode } from '@/lib/db/episodes'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Quality threshold — trigger research if top score is below this
const QUALITY_THRESHOLD = 0.42
const MIN_EPISODES = 3

export function needsResearch(episodes: ScoredEpisode[]): boolean {
  if (episodes.length < MIN_EPISODES) return true
  const maxScore = Math.max(...episodes.map(e => e.combined_score))
  return maxScore < QUALITY_THRESHOLD
}

const RESEARCH_TOOL: Anthropic.Tool = {
  name: 'synthesize_episode',
  description:
    'Generate a historically-grounded sanctions episode record that addresses the given scenario. ' +
    'Draw on real historical cases and known sanctions dynamics. Be analytically rigorous.',
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
        description: 'ID in format SYN_CTRYYYY_KEYWORD e.g. SYN_IRN2012_NUCLEAR — prefix with SYN_ to mark as synthesized',
      },
      name: { type: 'string' },
      start_date: { type: 'string', description: 'ISO date YYYY-MM-DD' },
      end_date: { type: ['string', 'null'] },
      initiators: { type: 'array', items: { type: 'string' } },
      target: { type: 'string' },
      target_gdp_pct_world: { type: ['number', 'null'] },
      sector: {
        type: 'string',
        enum: ['energy', 'finance', 'defense_nuclear', 'technology', 'comprehensive', 'trade'],
      },
      goals: { type: 'array', items: { type: 'string' } },
      multilateral: { type: 'boolean' },
      un_backed: { type: 'boolean' },
      enforcement_intensity: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'critical'],
      },
      measures: { type: 'array', items: { type: 'string' } },
      trigger_event: { type: ['string', 'null'] },
      workarounds: { type: 'array', items: { type: 'string' } },
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
      outcome: { type: ['string', 'null'] },
      objective_achieved: {
        type: ['string', 'null'],
        enum: ['yes', 'partial', 'no', 'backfire', null],
      },
      success_score: { type: ['number', 'null'], description: '0.0 to 1.0' },
      time_to_impact_months: { type: ['number', 'null'] },
      time_to_resolution_months: { type: ['number', 'null'] },
      key_turning_points: { type: 'array', items: { type: 'string' } },
      resolution: { type: ['string', 'null'] },
      lessons: { type: 'array', items: { type: 'string' } },
      tags: { type: 'array', items: { type: 'string' } },
      key_sources: { type: 'array', items: { type: 'string' } },
      wikipedia_url: { type: ['string', 'null'] },
      narrative: {
        type: 'string',
        description:
          '3-4 paragraph analytical narrative covering: geopolitical context and trigger, ' +
          'specific measures and target response, key turning points, outcome and operative lessons. ' +
          'Ground every claim in real historical patterns.',
      },
    },
  },
}

export async function researchEpisode(query: string): Promise<ScoredEpisode | null> {
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      tools: [RESEARCH_TOOL],
      tool_choice: { type: 'any' },
      messages: [
        {
          role: 'user',
          content:
            `A user has queried a sanctions scenario that our historical database does not cover well. ` +
            `Using your knowledge of international sanctions history, geopolitics, and economic statecraft, ` +
            `synthesize a historically-grounded episode record that directly addresses this scenario.\n\n` +
            `Draw on real historical cases — you may synthesize across multiple precedents if no single ` +
            `exact match exists, but every claim must be grounded in documented historical patterns. ` +
            `Be specific: name real mechanisms, real evasion routes, real turning points.\n\n` +
            `Scenario query: "${query}"`,
        },
      ],
    })

    const toolUse = msg.content.find(b => b.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') return null

    const raw = toolUse.input as Record<string, unknown>

    // Ensure episode_id has SYN_ prefix
    if (typeof raw.episode_id === 'string' && !raw.episode_id.startsWith('SYN_')) {
      raw.episode_id = `SYN_${raw.episode_id}`
    }

    // Generate embedding for semantic search consistency
    const narrativeText = [
      raw.name, raw.target, raw.sector, raw.trigger_event, raw.narrative,
      Array.isArray(raw.goals) ? (raw.goals as string[]).join('. ') : '',
      Array.isArray(raw.lessons) ? (raw.lessons as string[]).join('. ') : '',
      Array.isArray(raw.tags) ? (raw.tags as string[]).join(' ') : '',
    ].filter(Boolean).join('\n').slice(0, 6000)

    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: narrativeText,
    })

    const episode: ScoredEpisode = {
      episode_id: raw.episode_id as string,
      name: (raw.name as string) ?? '',
      start_date: (raw.start_date as string) ?? new Date().toISOString().slice(0, 10),
      end_date: (raw.end_date as string | null) ?? null,
      initiators: (raw.initiators as string[]) ?? [],
      target: (raw.target as string) ?? '',
      target_gdp_pct_world: (raw.target_gdp_pct_world as number | null) ?? null,
      sector: (raw.sector as string) ?? 'comprehensive',
      goals: (raw.goals as string[]) ?? [],
      multilateral: (raw.multilateral as boolean) ?? false,
      un_backed: (raw.un_backed as boolean) ?? false,
      enforcement_intensity: (raw.enforcement_intensity as 'low' | 'medium' | 'high' | 'critical') ?? 'medium',
      measures: (raw.measures as string[]) ?? [],
      trigger_event: (raw.trigger_event as string | null) ?? null,
      workarounds: (raw.workarounds as string[]) ?? [],
      target_economy: (raw.target_economy as ScoredEpisode['target_economy']) ?? null,
      outcome: (raw.outcome as string | null) ?? null,
      objective_achieved: (raw.objective_achieved as 'yes' | 'partial' | 'no' | 'backfire' | null) ?? null,
      outcomes_6mo: null,
      outcomes_12mo: null,
      success_score: (raw.success_score as number | null) ?? null,
      time_to_impact_months: (raw.time_to_impact_months as number | null) ?? null,
      time_to_resolution_months: (raw.time_to_resolution_months as number | null) ?? null,
      key_turning_points: (raw.key_turning_points as string[]) ?? [],
      resolution: (raw.resolution as string | null) ?? null,
      lessons: (raw.lessons as string[]) ?? [],
      tags: (raw.tags as string[]) ?? [],
      key_sources: (raw.key_sources as string[]) ?? [],
      wikipedia_url: (raw.wikipedia_url as string | null) ?? null,
      narrative: (raw.narrative as string | null) ?? null,
      embedding: embeddingRes.data[0].embedding,
      created_at: new Date().toISOString(),
      // Scoring — high enough to surface in results
      heuristic_score: 0.7,
      semantic_score: 0.7,
      combined_score: 0.7,
      synthesized: true,
    }

    return episode
  } catch (err) {
    console.error('researchEpisode failed:', err)
    return null
  }
}
