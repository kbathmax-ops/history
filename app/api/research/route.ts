import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/db/episodes'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 60

const SYSTEM_PROMPT = `You are a sanctions historian and analyst. Generate detailed, historically accurate sanctions episodes in structured JSON format. Be precise with dates, economic figures, and outcomes. Only generate episodes for real, documented historical events.`

const EPISODE_SCHEMA = `{
  "episode_id": "string (e.g. SYR2011_CIVIL — COUNTRYCODE+YEAR_DESCRIPTOR in caps)",
  "name": "string (full descriptive name)",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD or null if ongoing",
  "initiators": ["US", "EU", "UN", "UK", etc],
  "target": "Country name",
  "target_gdp_pct_world": "number or null",
  "sector": "one of: energy | finance | defense_nuclear | technology | comprehensive | trade | energy_finance",
  "goals": ["specific policy objectives"],
  "multilateral": "boolean",
  "un_backed": "boolean",
  "enforcement_intensity": "one of: low | medium | high | critical",
  "measures": ["specific sanctions measures enacted"],
  "trigger_event": "string describing what triggered the sanctions",
  "workarounds": ["documented evasion methods used by the target country"],
  "target_economy": {
    "gdp_change_pct": "number or null",
    "oil_export_change_pct": "number or null",
    "inflation_pct": "number or null",
    "currency_devaluation_pct": "number or null",
    "alternative_partners": ["countries that continued trading with target"]
  },
  "outcome": "brief outcome description string",
  "objective_achieved": "one of: yes | partial | no | backfire",
  "outcomes_6mo": {
    "scenarios": [
      {"label": "status_quo", "probability": 0.X},
      {"label": "compliance", "probability": 0.X},
      {"label": "escalation", "probability": 0.X},
      {"label": "backfire", "probability": 0.X}
    ],
    "gdp_impact_pct": "number or null"
  },
  "outcomes_12mo": {
    "scenarios": [
      {"label": "status_quo", "probability": 0.X},
      {"label": "compliance", "probability": 0.X},
      {"label": "escalation", "probability": 0.X},
      {"label": "backfire", "probability": 0.X}
    ],
    "gdp_impact_pct": "number or null"
  },
  "success_score": "number between 0.0 and 1.0",
  "time_to_impact_months": "integer or null",
  "time_to_resolution_months": "integer or null (null if ongoing)",
  "key_turning_points": ["array of key events that changed the trajectory"],
  "resolution": "how it was resolved or null if ongoing",
  "lessons": ["3-5 key analytical lessons for future sanctions designers"],
  "tags": ["relevant tags e.g. energy, arms_embargo, swift, secondary_sanctions"],
  "key_sources": ["academic papers, reports, or journalism — real sources only"],
  "wikipedia_url": "URL or null",
  "narrative": "2-3 paragraph analytical narrative summarising the episode"
}`

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json()

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 })
    }

    if (query.length > 500) {
      return NextResponse.json({ error: 'query too long (max 500 chars)' }, { status: 400 })
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Generate a complete historical sanctions episode related to: "${query.trim()}"

Return ONLY valid JSON matching this exact schema (no markdown, no explanation):
${EPISODE_SCHEMA}

Requirements:
- scenario probabilities in outcomes_6mo and outcomes_12mo MUST sum to 1.0 each
- episode_id must be unique and follow the COUNTRYCODE+YEAR_DESCRIPTOR format
- Only generate real, documented historical cases
- Be precise with economic figures — use null if unknown rather than guessing`,
        },
      ],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

    // Strip markdown code fences if present
    const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')

    let episodeData: Record<string, unknown>
    try {
      episodeData = JSON.parse(json)
    } catch {
      console.error('Claude returned invalid JSON:', raw.slice(0, 500))
      return NextResponse.json({ error: 'Failed to parse generated episode data' }, { status: 500 })
    }

    // Store in pending_cases for admin review
    const { data, error } = await supabase
      .from('pending_cases')
      .insert({ episode_data: episodeData, query: query.trim() })
      .select('id')
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: 'Failed to store pending case' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Episode generated and queued for admin review',
      pending_id: data.id,
      episode_id: episodeData.episode_id,
      name: episodeData.name,
    })
  } catch (err) {
    console.error('/api/research error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
