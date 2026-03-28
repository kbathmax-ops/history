'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ScoredEpisode } from '@/lib/db/episodes'
import { ForecastResult } from '@/lib/agent/forecast'
import { NarrativeResult } from '@/lib/claude/narrative'

interface ResultData {
  query: string
  data: {
    episodes: ScoredEpisode[]
    forecast: ForecastResult
    narrative: NarrativeResult
    query_filters: Record<string, unknown>
  }
}

function ProbBar({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  const pct = Math.round(value * 100)
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-[#888]">{label}</span>
        <span className="text-[#bbb] font-mono">{pct}%</span>
      </div>
      <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function RiskGauge({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100)
  const color =
    value > 0.65 ? 'text-red-400' : value > 0.40 ? 'text-amber-400' : 'text-green-400'
  const ring =
    value > 0.65 ? 'border-red-900/50' : value > 0.40 ? 'border-amber-900/50' : 'border-green-900/50'

  return (
    <div className={`border ${ring} rounded-lg p-4 bg-[#0f0f0f] text-center`}>
      <div className={`text-2xl font-mono font-semibold ${color}`}>{pct}%</div>
      <div className="text-xs text-[#555] mt-1">{label}</div>
    </div>
  )
}

function EpisodeCard({ ep, index }: { ep: ScoredEpisode; index: number }) {
  const score = Math.round(ep.success_score ?? 0 * 100)
  const successColor =
    (ep.success_score ?? 0) > 0.6
      ? 'text-green-400'
      : (ep.success_score ?? 0) > 0.3
      ? 'text-amber-400'
      : 'text-red-400'

  return (
    <div className="border border-[#1f1f1f] rounded-lg p-5 bg-[#0d0d0d] hover:border-[#2a2a2a] transition-colors">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <span className="text-xs text-[#444] font-mono mr-2">#{index + 1}</span>
          <span className="text-xs font-mono text-[#555] bg-[#151515] px-2 py-0.5 rounded">
            {ep.episode_id}
          </span>
        </div>
        <span className={`text-xs font-mono ${successColor}`}>
          {Math.round((ep.success_score ?? 0) * 100)}/100
        </span>
      </div>

      <h3 className="text-sm font-medium text-[#ddd] mb-2">{ep.name}</h3>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[#666] mb-3">
        <span>Target: <span className="text-[#888]">{ep.target}</span></span>
        <span>
          {ep.start_date.slice(0, 4)}–{ep.end_date ? ep.end_date.slice(0, 4) : 'ongoing'}
        </span>
        <span>
          {ep.multilateral ? 'Multilateral' : 'Unilateral'} ·{' '}
          <span className="capitalize">{ep.enforcement_intensity}</span>
        </span>
        <span>Outcome: <span className="text-[#888]">{ep.outcome ?? 'ongoing'}</span></span>
      </div>

      {ep.workarounds.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-[#444] uppercase tracking-wider mb-1.5">Top evasion methods</p>
          <ul className="space-y-1">
            {ep.workarounds.slice(0, 2).map((w, i) => (
              <li key={i} className="text-xs text-[#555] flex gap-2">
                <span className="text-[#333] mt-0.5 shrink-0">—</span>
                <span>{w.slice(0, 120)}{w.length > 120 ? '…' : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-[#444]">Match score:</span>
        <span className="text-xs font-mono text-[#666]">
          {Math.round(ep.combined_score * 100)}%
        </span>
      </div>
    </div>
  )
}

function Memo({ text }: { text: string }) {
  // Convert markdown headers and bold to styled HTML
  const lines = text.split('\n')
  return (
    <div className="space-y-3 text-sm text-[#bbb] leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          return (
            <h3 key={i} className="text-[#e5e5e5] font-semibold text-sm mt-5 mb-2 first:mt-0">
              {line.slice(3)}
            </h3>
          )
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={i} className="flex gap-2 text-[#999]">
              <span className="text-[#444] shrink-0 mt-0.5">—</span>
              <span dangerouslySetInnerHTML={{ __html: boldify(line.slice(2)) }} />
            </div>
          )
        }
        if (line.trim() === '') return <div key={i} className="h-1" />
        return (
          <p
            key={i}
            className="text-[#999]"
            dangerouslySetInnerHTML={{ __html: boldify(line) }}
          />
        )
      })}
    </div>
  )
}

function boldify(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#ccc]">$1</strong>')
}

export default function ResultsPage() {
  const router = useRouter()
  const [result, setResult] = useState<ResultData | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('sanctions_result')
    if (!stored) {
      router.push('/')
      return
    }
    try {
      setResult(JSON.parse(stored))
    } catch {
      router.push('/')
    }
  }, [router])

  if (!result) return null

  const { query, data } = result
  const { episodes, forecast, narrative } = data

  return (
    <div className="space-y-10">
      {/* Query header */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-xs text-[#555] uppercase tracking-wider mb-2">Query</p>
          <p className="text-[#ccc] text-base">{query}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => window.print()}
            className="text-xs text-[#555] hover:text-[#888] border border-[#222] hover:border-[#333] rounded px-3 py-1.5 transition-colors"
          >
            Export PDF
          </button>
          <button
            onClick={() => router.push('/')}
            className="text-xs text-[#555] hover:text-[#888] border border-[#222] hover:border-[#333] rounded px-3 py-1.5 transition-colors"
          >
            New query
          </button>
        </div>
      </div>

      {/* Forecast panel */}
      <section>
        <h2 className="text-xs text-[#555] uppercase tracking-wider mb-4">
          Scenario forecast
          <span className="ml-2 text-[#333]">
            ({Math.round(forecast.confidence * 100)}% confidence · {episodes.length} precedents)
          </span>
        </h2>

        <div className="border border-[#1f1f1f] rounded-lg p-6 bg-[#0d0d0d]">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <ProbBar
                label="Base — status quo / stalemate"
                value={forecast.scenario_probs.base}
                color="bg-[#555]"
              />
              <ProbBar
                label="Hawkish — escalation"
                value={forecast.scenario_probs.hawkish}
                color="bg-red-800"
              />
              <ProbBar
                label="Dove — compliance / negotiated relief"
                value={forecast.scenario_probs.dove}
                color="bg-green-900"
              />
              <ProbBar
                label="Backfire — counterproductive"
                value={forecast.scenario_probs.backfire}
                color="bg-amber-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 content-start">
              <RiskGauge label="Initiator fatigue risk" value={forecast.initiator_fatigue_score} />
              <RiskGauge label="Target workaround risk" value={forecast.workaround_risk} />
              <div className="border border-[#1f1f1f] rounded-lg p-4 bg-[#0f0f0f] text-center">
                <div className="text-2xl font-mono font-semibold text-[#bbb]">
                  {Math.round(forecast.expected_success_score * 100)}
                </div>
                <div className="text-xs text-[#555] mt-1">Expected success (0–100)</div>
              </div>
              <div className="border border-[#1f1f1f] rounded-lg p-4 bg-[#0f0f0f] text-center">
                <div className="text-2xl font-mono font-semibold text-[#bbb]">
                  {forecast.time_to_impact_est_months ?? '?'}
                </div>
                <div className="text-xs text-[#555] mt-1">Months to economic impact</div>
              </div>
            </div>
          </div>

          {forecast.top_wildcards.length > 0 && (
            <div className="border-t border-[#1a1a1a] pt-4">
              <p className="text-xs text-[#444] uppercase tracking-wider mb-2">Wildcard risks</p>
              <div className="flex flex-wrap gap-2">
                {forecast.top_wildcards.map((w, i) => (
                  <span
                    key={i}
                    className="text-xs text-[#666] border border-[#222] rounded px-2 py-1 bg-[#0f0f0f]"
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Matched episodes */}
      <section>
        <h2 className="text-xs text-[#555] uppercase tracking-wider mb-4">
          Top matched precedents ({episodes.length})
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {episodes.map((ep, i) => (
            <EpisodeCard key={ep.episode_id} ep={ep} index={i} />
          ))}
        </div>
      </section>

      {/* Claude narrative */}
      <section>
        <h2 className="text-xs text-[#555] uppercase tracking-wider mb-4">
          Analytical memo
          <span className="ml-2 text-[#333]">({narrative.model})</span>
        </h2>
        <div className="border border-[#1f1f1f] rounded-lg p-6 bg-[#0d0d0d]">
          <Memo text={narrative.memo} />
        </div>
        {narrative.episode_ids_cited.length > 0 && (
          <p className="text-xs text-[#444] mt-3">
            Episodes cited: {narrative.episode_ids_cited.join(', ')}
          </p>
        )}
      </section>

      {/* Top lessons */}
      {forecast.top_lessons.length > 0 && (
        <section>
          <h2 className="text-xs text-[#555] uppercase tracking-wider mb-4">
            Key lessons from precedents
          </h2>
          <div className="space-y-3">
            {forecast.top_lessons.map((lesson, i) => (
              <div key={i} className="flex gap-3 text-sm text-[#666]">
                <span className="text-[#333] shrink-0 font-mono mt-0.5">{i + 1}.</span>
                <span>{lesson}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
