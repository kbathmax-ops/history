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
    `  Target: ${ep.target} | Multilateral: ${ep.multilateral} | Intensity: ${ep.enforcement_intensity}\n` +
    `  Outcome: ${ep.outcome ?? 'ongoing'} | Success score: ${ep.success_score ?? 'N/A'}\n` +
    `  Time to impact: ${ep.time_to_impact_months ?? 'unknown'} months\n` +
    `  Key lessons: ${ep.lessons.slice(0, 2).join(' | ')}\n` +
    `  Workarounds: ${ep.workarounds.slice(0, 3).join('; ')}`
  ).join('\n\n')

  return `You are a sanctions analyst. Based on the following structured forecast data and historical precedents, write a concise analytical memo.

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
2. In ## Assessment: state the base scenario and expected success in 2-3 sentences. Use the exact percentages above.
3. In ## Scenario Analysis: describe each scenario (base/hawkish/dove/backfire) in 1-2 sentences each. Reference specific episode IDs in brackets, e.g. [IRN2012_NUCLEAR].
4. In ## Key Risks: list the top 3 risks. Include initiator fatigue and workaround risk using the exact scores above. Reference at least one episode per risk.
5. In ## Precedent Basis: briefly explain which 2-3 episodes are most relevant and why, with episode IDs in brackets.
6. Do NOT make absolute predictions. Use language like "historical precedent suggests", "based on comparable cases", "probability-weighted".
7. Do NOT invent facts not present in the data above.
8. Keep the total memo under 500 words.`
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

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system:
      'You are a precise sanctions analyst. You write concise, evidence-based memos. ' +
      'You always cite historical episode IDs. You never make absolute predictions. ' +
      'You use only the data provided — never invent statistics or outcomes.',
    messages: [{ role: 'user', content: prompt }],
  })

  const memo =
    message.content[0].type === 'text' ? message.content[0].text : ''

  // Extract cited episode IDs from the memo
  const episodeIdPattern = /\[([A-Z]{2,4}\d{4}_[A-Z_]+)\]/g
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
}
