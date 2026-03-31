import Anthropic from '@anthropic-ai/sdk'
import { ScoredEpisode } from '@/lib/db/episodes'
import { ForecastResult } from '@/lib/agent/forecast'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function formatPercent(n: number): string {
  return `${Math.round(n * 100)}%`
}

function buildPrompt(
  query: string,
  episodes: ScoredEpisode[],
  forecast: ForecastResult
): string {
  const episodeSummaries = episodes.map((ep, i) =>
    `[${i + 1}] ${ep.episode_id} — ${ep.name} (${ep.start_date.slice(0, 4)})\n` +
    `  Initiators: ${ep.initiators.join(', ')} → Target: ${ep.target} | Multilateral: ${ep.multilateral} | UN-backed: ${ep.un_backed}\n` +
    `  Sector: ${ep.sector} | Intensity: ${ep.enforcement_intensity}\n` +
    `  Goals: ${ep.goals.slice(0, 3).join('; ')}\n` +
    `  Measures: ${ep.measures.slice(0, 4).join('; ')}\n` +
    `  Trigger: ${ep.trigger_event ?? 'not specified'}\n` +
    `  Outcome: ${ep.outcome ?? 'ongoing'} | Objective achieved: ${ep.objective_achieved ?? 'N/A'} | Success score: ${ep.success_score ?? 'N/A'}\n` +
    `  Time to impact: ${ep.time_to_impact_months ?? 'unknown'} months | Time to resolution: ${ep.time_to_resolution_months ?? 'ongoing'} months\n` +
    `  Key turning points: ${ep.key_turning_points.slice(0, 3).join(' | ')}\n` +
    `  Workarounds used: ${ep.workarounds.slice(0, 3).join('; ')}\n` +
    `  Resolution: ${ep.resolution ?? 'unresolved'}\n` +
    `  Lessons: ${ep.lessons.slice(0, 2).join(' | ')}`
  ).join('\n\n')

  return `You are a senior sanctions analyst producing an operational intelligence memo. Based on the structured forecast and historical precedent data below, write a precise analytical memo that goes beyond broad observations to name specific mechanisms, actors, and turning points.

USER QUERY: ${query}

FORECAST (computed from historical data — do not alter these numbers):
- Base scenario (status quo / stalemate): ${formatPercent(forecast.scenario_probs.base)}
- Hawkish scenario (escalation): ${formatPercent(forecast.scenario_probs.hawkish)}
- Dove scenario (compliance / negotiated relief): ${formatPercent(forecast.scenario_probs.dove)}
- Backfire scenario: ${formatPercent(forecast.scenario_probs.backfire)}
- Expected success score: ${Math.round(forecast.expected_success_score * 100)}/100
- Initiator fatigue risk: ${formatPercent(forecast.initiator_fatigue_score)}
- Target workaround risk: ${formatPercent(forecast.workaround_risk)}
- Estimated time to economic impact: ${forecast.time_to_impact_est_months ?? 'uncertain'} months
- Wildcards: ${forecast.top_wildcards.join(', ') || 'none identified'}

TOP MATCHING PRECEDENTS:
${episodeSummaries}

INSTRUCTIONS (follow exactly):
1. Write a memo with these four sections: ## Assessment, ## Scenario Analysis, ## Key Risks, ## Precedent Basis
2. In ## Assessment: give a 3-4 sentence operational verdict. State the base scenario probability, expected success score, and the single most important structural factor (e.g. third-party trade relationships, enforcement gaps, domestic political timeline) that will determine the outcome. Be specific — name countries, institutions, or mechanisms where the data supports it.
3. In ## Scenario Analysis: for each of the four scenarios (base/hawkish/dove/backfire), write 2-3 sentences. For each scenario: (a) identify the specific trigger or condition that would cause it, (b) name the evasion route or compliance mechanism most likely to dominate, (c) cite the most analogous episode ID in brackets. Use confidence language: "high probability", "plausible if", "unlikely absent X".
4. In ## Key Risks: list exactly 3 operational risks. Each risk must include: the mechanism (how it would unfold), a named historical analogue from the episodes above (with episode ID in brackets), and the specific indicator to watch. Use the exact initiator fatigue (${formatPercent(forecast.initiator_fatigue_score)}) and workaround risk (${formatPercent(forecast.workaround_risk)}) scores.
5. In ## Precedent Basis: identify the 2-3 most structurally similar episodes. For each: explain the specific parallel (not just "similar target" — explain what structural feature matches), note what succeeded or failed, and extract the operative lesson for this scenario. Use episode IDs in brackets.
6. Do NOT make absolute predictions. Use calibrated language: "historical precedent suggests", "comparable cases show", "probability-weighted outcome".
7. Do NOT invent facts, countries, actors, or outcomes not present in the data above.
8. Aim for 550-700 words. Prioritize operational specificity over length.`
}

export interface NarrativeResult {
  memo: string
  model: string
  episode_ids_cited: string[]
}

export async function generateNarrative(
  query: string,
  episodes: ScoredEpisode[],
  forecast: ForecastResult
): Promise<NarrativeResult> {
  const prompt = buildPrompt(query, episodes, forecast)

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system:
        'You are a precise sanctions analyst. You write concise, evidence-based memos. ' +
        'You always cite historical episode IDs. You never make absolute predictions. ' +
        'You use only the data provided — never invent statistics or outcomes.',
      messages: [{ role: 'user', content: prompt }],
    })

    const memo =
      message.content[0].type === 'text' ? message.content[0].text : ''

    // Extract cited episode IDs from the memo
    const episodeIdPattern = /\[((SYN_)?[A-Z]{2,4}\d{4}_[A-Z_]+)\]/g
    const cited = new Set<string>()
    let match: RegExpExecArray | null
    while ((match = episodeIdPattern.exec(memo)) !== null) {
      cited.add(match[1])
    }

    return {
      memo,
      model: 'claude-sonnet-4-6',
      episode_ids_cited: Array.from(cited),
    }
  } catch (err) {
    console.error('generateNarrative failed:', err)
    return {
      memo: '',
      model: 'claude-sonnet-4-6',
      episode_ids_cited: [],
    }
  }
}
