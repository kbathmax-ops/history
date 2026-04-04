import { ScoredEpisode, Outcomes } from '@/lib/db/episodes'

export interface ScenarioProbabilities {
  base: number      // status quo / partial compliance
  hawkish: number   // escalation / military action
  dove: number      // compliance / negotiated relief
  backfire: number  // counterproductive / regime hardening
}

export interface ForecastResult {
  scenario_probs: ScenarioProbabilities
  initiator_fatigue_score: number   // 0–1: higher = sanctions likely to erode within 18 months
  workaround_risk: number           // 0–1: higher = target likely to evade effectively
  time_to_impact_est_months: number | null
  expected_success_score: number    // weighted avg from precedents
  top_wildcards: string[]
  top_lessons: string[]
  supporting_episodes: string[]     // episode_ids used
  confidence: number                // 0–1: how many precedents informed this
}

// Map scenario labels from DB to our three buckets
const DOVE_LABELS = new Set([
  'compliance', 'negotiated_relief', 'negotiated_transition',
  'negotiated_ceasefire', 'negotiated_freeze', 'partial_compliance', 'ICC_accountability',
])
const HAWK_LABELS = new Set([
  'escalation', 'military_escalation',
])
const BACKFIRE_LABELS = new Set(['backfire'])

function aggregateScenarios(
  pairs: { outcomes: Outcomes | null; weight: number }[]
): ScenarioProbabilities {
  const valid = pairs.filter(p => p.outcomes !== null) as { outcomes: Outcomes; weight: number }[]
  if (valid.length === 0) {
    return { base: 0.5, hawkish: 0.25, dove: 0.15, backfire: 0.10 }
  }

  let totalBase = 0, totalHawk = 0, totalDove = 0, totalBackfire = 0
  let totalWeight = 0

  for (const { outcomes, weight } of valid) {
    let base = 0, hawk = 0, dove = 0, back = 0
    for (const s of outcomes.scenarios) {
      const label = s.label.toLowerCase()
      if (BACKFIRE_LABELS.has(label)) {
        back += s.probability
      } else if (HAWK_LABELS.has(label)) {
        hawk += s.probability
      } else if (DOVE_LABELS.has(label)) {
        dove += s.probability
      } else {
        base += s.probability
      }
    }
    totalBase += base * weight
    totalHawk += hawk * weight
    totalDove += dove * weight
    totalBackfire += back * weight
    totalWeight += weight
  }

  if (totalWeight === 0) {
    return { base: 0.5, hawkish: 0.25, dove: 0.15, backfire: 0.10 }
  }

  const probs = {
    base: totalBase / totalWeight,
    hawkish: totalHawk / totalWeight,
    dove: totalDove / totalWeight,
    backfire: totalBackfire / totalWeight,
  }

  // Normalize to sum to 1
  const sum = probs.base + probs.hawkish + probs.dove + probs.backfire
  if (sum > 0) {
    probs.base /= sum
    probs.hawkish /= sum
    probs.dove /= sum
    probs.backfire /= sum
  }

  return probs
}

/**
 * Initiator fatigue score:
 * Based on time_to_resolution_months from similar cases.
 * Unilateral sanctions < 12 months → 65% lift rate (high fatigue).
 * Short resolution history → higher fatigue score.
 */
function computeInitiatorFatigue(episodes: ScoredEpisode[]): number {
  const resolutions = episodes
    .map(e => e.time_to_resolution_months)
    .filter((v): v is number => v !== null)

  if (resolutions.length === 0) {
    // No resolution data → moderate fatigue
    return 0.5
  }

  const unilateralShort = episodes.filter(
    e => !e.multilateral && e.time_to_resolution_months !== null && e.time_to_resolution_months < 18
  ).length

  const unilateralTotal = episodes.filter(e => !e.multilateral).length
  const multilateralLong = episodes.filter(
    e => e.multilateral && e.time_to_resolution_months !== null && e.time_to_resolution_months > 36
  ).length

  let fatigue = 0.3 // base

  if (unilateralTotal > 0) {
    fatigue += 0.35 * (unilateralShort / unilateralTotal)
  }

  if (episodes.length > 0) {
    fatigue += 0.15 * (multilateralLong / episodes.length)
  }

  return Math.min(1, Math.max(0, fatigue))
}

/**
 * Workaround risk score:
 * Based on number and diversity of evasion methods across similar cases,
 * alternative_partners, and whether China/Russia appear as partners.
 */
function computeWorkaroundRisk(episodes: ScoredEpisode[]): number {
  if (episodes.length === 0) return 0.5

  let risk = 0

  // Average number of workarounds (more methods = higher risk)
  const avgWorkarounds =
    episodes.reduce((sum, e) => sum + e.workarounds.length, 0) / episodes.length
  risk += Math.min(0.35, avgWorkarounds * 0.05)

  // China or Russia as alternative partners (structural evasion routes)
  const majorEvasionSponsor = episodes.filter(e => {
    const partners = e.target_economy?.alternative_partners ?? []
    return partners.some(p =>
      p.toLowerCase().includes('china') || p.toLowerCase().includes('russia')
    )
  }).length
  risk += 0.30 * (majorEvasionSponsor / episodes.length)

  // Shadow fleet / crypto / SPFS keywords → technical evasion
  const technicalEvasion = episodes.filter(e =>
    e.workarounds.some(w =>
      w.toLowerCase().includes('shadow fleet') ||
      w.toLowerCase().includes('crypto') ||
      w.toLowerCase().includes('spfs') ||
      w.toLowerCase().includes('cips') ||
      w.toLowerCase().includes('ais') ||
      w.toLowerCase().includes('hawala')
    )
  ).length
  risk += 0.25 * (technicalEvasion / episodes.length)

  // Success score: lower success in past → higher workaround risk
  const avgSuccess =
    episodes.reduce((sum, e) => sum + (e.success_score ?? 0.3), 0) / episodes.length
  risk += 0.10 * (1 - avgSuccess)

  return Math.min(1, Math.max(0, risk))
}

function estimateTimeToImpact(episodes: ScoredEpisode[]): number | null {
  const times = episodes
    .map(e => e.time_to_impact_months)
    .filter((v): v is number => v !== null)

  if (times.length === 0) return null
  return Math.round(times.reduce((a, b) => a + b, 0) / times.length)
}

function weightedSuccessScore(episodes: ScoredEpisode[]): number {
  const scored = episodes.filter(e => e.success_score !== null)
  if (scored.length === 0) return 0.3

  const totalWeight = scored.reduce((sum, e) => sum + e.combined_score, 0)
  if (totalWeight === 0) return 0.3

  return scored.reduce(
    (sum, e) => sum + (e.success_score! * e.combined_score),
    0
  ) / totalWeight
}

function extractWildcards(episodes: ScoredEpisode[]): string[] {
  // Pull unique wildcards from workarounds + lessons that are unusual/high-signal
  const wildcardKeywords = ['shadow fleet', 'cyber', 'crypto', 'nuclear deterrent',
    'war economy', 'oil price', 'regime collapse', 'military intervention', 'coalition fracture']

  const found = new Set<string>()

  for (const ep of episodes) {
    for (const w of ep.workarounds) {
      for (const kw of wildcardKeywords) {
        if (w.toLowerCase().includes(kw)) {
          found.add(kw.charAt(0).toUpperCase() + kw.slice(1))
        }
      }
    }
    for (const lesson of ep.lessons) {
      if (lesson.toLowerCase().includes('military') && lesson.length < 120) {
        found.add('Military escalation risk')
      }
      if (lesson.toLowerCase().includes('coalition') && lesson.length < 120) {
        found.add('Coalition fracture risk')
      }
    }
  }

  return Array.from(found).slice(0, 5)
}

function extractTopLessons(episodes: ScoredEpisode[]): string[] {
  // Weight lessons by combined_score of the episode, deduplicate, return top 3
  const lessonScores = new Map<string, number>()

  for (const ep of episodes) {
    for (const lesson of ep.lessons) {
      // Use first 80 chars as key for dedup
      const key = lesson.slice(0, 80)
      const existing = lessonScores.get(key) ?? 0
      lessonScores.set(key, existing + ep.combined_score)
    }
  }

  return Array.from(lessonScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key]) => {
      // Find full lesson text
      for (const ep of episodes) {
        const full = ep.lessons.find(l => l.startsWith(key))
        if (full) return full
      }
      return key
    })
}

export function computeForecast(
  episodes: ScoredEpisode[]
): ForecastResult {
  if (episodes.length === 0) {
    return {
      scenario_probs: { base: 0.5, hawkish: 0.25, dove: 0.15, backfire: 0.10 },
      initiator_fatigue_score: 0.5,
      workaround_risk: 0.5,
      time_to_impact_est_months: null,
      expected_success_score: 0.3,
      top_wildcards: [],
      top_lessons: [],
      supporting_episodes: [],
      confidence: 0,
    }
  }

  // Use 6-month outcomes as primary signal, 12-month as secondary.
  // Each episode's probabilities are weighted by its combined_score (match quality).
  const pairs6mo = episodes.map(e => ({ outcomes: e.outcomes_6mo, weight: e.combined_score }))
  const pairs12mo = episodes.map(e => ({ outcomes: e.outcomes_12mo, weight: e.combined_score }))

  const probs6 = aggregateScenarios(pairs6mo)
  const probs12 = aggregateScenarios(pairs12mo)

  const scenario_probs: ScenarioProbabilities = {
    base: probs6.base * 0.6 + probs12.base * 0.4,
    hawkish: probs6.hawkish * 0.6 + probs12.hawkish * 0.4,
    dove: probs6.dove * 0.6 + probs12.dove * 0.4,
    backfire: probs6.backfire * 0.6 + probs12.backfire * 0.4,
  }

  // Normalize
  const sum = Object.values(scenario_probs).reduce((a, b) => a + b, 0)
  if (sum > 0) {
    scenario_probs.base /= sum
    scenario_probs.hawkish /= sum
    scenario_probs.dove /= sum
    scenario_probs.backfire /= sum
  }

  return {
    scenario_probs,
    initiator_fatigue_score: computeInitiatorFatigue(episodes),
    workaround_risk: computeWorkaroundRisk(episodes),
    time_to_impact_est_months: estimateTimeToImpact(episodes),
    expected_success_score: weightedSuccessScore(episodes),
    top_wildcards: extractWildcards(episodes),
    top_lessons: extractTopLessons(episodes),
    supporting_episodes: episodes.map(e => e.episode_id),
    confidence: (() => {
      const avgScore = episodes.reduce((s, e) => s + e.combined_score, 0) / episodes.length
      return Math.min(1, (episodes.length / 5) * avgScore)
    })(),
  }
}
