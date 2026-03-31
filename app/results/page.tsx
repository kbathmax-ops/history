'use client'

import { useEffect, useState, useRef } from 'react'
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

/* ─── Scroll reveal — re-runs after data loads ─── */
function useScrollReveal(ready: boolean) {
  useEffect(() => {
    if (!ready) return
    const els = document.querySelectorAll('[data-r]')
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis') }),
      { threshold: 0.08 }
    )
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [ready])
}

/* ─── Animated counter ─── */
function AnimatedNumber({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      obs.disconnect()
      let start = 0
      const duration = 900
      const step = performance.now()
      const tick = (now: number) => {
        const progress = Math.min((now - step) / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setDisplay(Math.round(eased * target))
        if (progress < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.5 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [target])

  return <span ref={ref}>{display}{suffix}</span>
}

/* ─── Scenario probability row ─── */
function ScenarioRow({
  label, sublabel, value, accentColor,
}: {
  label: string; sublabel: string; value: number; accentColor: string
}) {
  const pct = Math.round(value * 100)
  const barRef = useRef<HTMLDivElement>(null)
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const el = barRef.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setAnimated(true); obs.disconnect() }
    }, { threshold: 0.5 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div className="flex items-center gap-6 py-4" style={{ borderBottom: '1px solid var(--bd)' }}>
      <div className="w-16 shrink-0 text-right">
        <span
          className="text-[2rem] font-bold leading-none tabular-nums"
          style={{ color: accentColor, fontFamily: 'var(--font-mono)' }}
        >
          {pct}%
        </span>
      </div>
      <div className="flex-1">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-[13px] font-semibold" style={{ color: 'var(--t1)' }}>{label}</span>
          <span className="text-[11px]" style={{ color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>{sublabel}</span>
        </div>
        <div ref={barRef} className="h-[3px] w-full rounded-full overflow-hidden" style={{ background: 'var(--bd2)' }}>
          <div
            className="h-full rounded-full transition-all duration-[1200ms] ease-out"
            style={{ width: animated ? `${pct}%` : '0%', background: accentColor }}
          />
        </div>
      </div>
    </div>
  )
}

/* ─── Metric tile ─── */
function MetricTile({ label, value, unit, color }: {
  label: string; value: number | string; unit?: string; color?: string
}) {
  const numVal = typeof value === 'number' ? Math.round(value) : null
  return (
    <div className="py-6 px-5" style={{ borderLeft: '1px solid var(--bd2)' }}>
      <div
        className="text-[2.2rem] font-bold leading-none tabular-nums mb-2"
        style={{ color: color ?? 'var(--t1)', fontFamily: 'var(--font-mono)' }}
      >
        {numVal !== null
          ? <AnimatedNumber target={numVal} suffix={unit ?? ''} />
          : <span>{value}{unit}</span>}
      </div>
      <p
        className="text-[9.5px] uppercase tracking-[0.2em] leading-snug"
        style={{ color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}
      >
        {label}
      </p>
    </div>
  )
}

/* ─── Episode row ─── */
function EpisodeRow({ ep, index }: { ep: ScoredEpisode; index: number }) {
  const success = ep.success_score ?? 0
  const successColor =
    success > 0.6 ? '#5a8a6a' : success > 0.3 ? '#9a7a3a' : '#b05a5a'
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function handleSave() {
    setSaveState('saving')
    try {
      const res = await fetch('/api/episodes/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ep),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Save failed')
      setSaveState('saved')
    } catch {
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 3000)
    }
  }

  return (
    <div
      className="group py-6"
      style={{ borderBottom: '1px solid var(--bd)' }}
      data-r
      data-d={String(index + 1)}
    >
      <div className="flex items-start justify-between gap-8">
        {/* Left: meta */}
        <div className="flex items-start gap-4 min-w-0">
          <span
            className="text-[11px] tabular-nums mt-0.5 shrink-0"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--t4)' }}
          >
            {String(index + 1).padStart(2, '0')}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
                className="text-[10px] px-2 py-0.5 rounded-sm"
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--t3)',
                  background: 'var(--bd2)',
                }}
              >
                {ep.episode_id}
              </span>
              {ep.synthesized && saveState !== 'saved' && (
                <span
                  className="text-[9px] px-2 py-0.5 rounded-sm uppercase tracking-[0.18em]"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: '#9a7a3a',
                    background: 'rgba(154,122,58,0.12)',
                    border: '1px solid rgba(154,122,58,0.25)',
                  }}
                >
                  Researched
                </span>
              )}
              {saveState === 'saved' && (
                <span
                  className="text-[9px] px-2 py-0.5 rounded-sm uppercase tracking-[0.18em]"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: '#5a8a6a',
                    background: 'rgba(90,138,106,0.12)',
                    border: '1px solid rgba(90,138,106,0.25)',
                  }}
                >
                  Saved
                </span>
              )}
              <span
                className="text-[10px] uppercase tracking-[0.15em]"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--t3)' }}
              >
                {ep.start_date.slice(0, 4)}{ep.end_date ? `–${ep.end_date.slice(0, 4)}` : '–ongoing'}
              </span>
            </div>

            <h3
              className="text-[15px] font-semibold mb-3 leading-snug"
              style={{ color: 'var(--t1)' }}
            >
              {ep.name}
            </h3>

            <div
              className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] mb-3"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--t3)' }}
            >
              <span>Target: <span style={{ color: 'var(--t2)' }}>{ep.target}</span></span>
              <span>{ep.multilateral ? 'Multilateral' : 'Unilateral'}</span>
              <span className="capitalize">{ep.enforcement_intensity} intensity</span>
              <span>Outcome: <span style={{ color: 'var(--t2)' }}>{ep.outcome ?? 'ongoing'}</span></span>
              <span>Match: <span style={{ color: 'var(--t2)' }}>{Math.round(ep.combined_score * 100)}%</span></span>
            </div>

            {ep.workarounds.length > 0 && (
              <div>
                <p
                  className="text-[9px] uppercase tracking-[0.22em] mb-1.5"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--t4)' }}
                >
                  Evasion methods
                </p>
                <div className="space-y-0.5">
                  {ep.workarounds.slice(0, 2).map((w, i) => (
                    <p key={i} className="text-[12.5px] leading-relaxed" style={{ color: 'var(--t3)' }}>
                      <span style={{ color: 'var(--t4)', marginRight: '0.5rem' }}>—</span>
                      {w.slice(0, 130)}{w.length > 130 ? '…' : ''}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {ep.synthesized && saveState !== 'saved' && (
              <div className="mt-4">
                <button
                  onClick={handleSave}
                  disabled={saveState === 'saving'}
                  className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-[9.5px] uppercase tracking-[0.2em] transition-all hover:opacity-70 disabled:opacity-40"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: '#9a7a3a',
                    borderColor: 'rgba(154,122,58,0.3)',
                    background: 'rgba(154,122,58,0.06)',
                  }}
                >
                  {saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Failed — retry' : '+ Save to database'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: success score */}
        <div className="shrink-0 text-right">
          <div
            className="text-[1.6rem] font-bold tabular-nums leading-none"
            style={{ color: successColor, fontFamily: 'var(--font-mono)' }}
          >
            {Math.round(success * 100)}
          </div>
          <p
            className="text-[8.5px] uppercase tracking-[0.18em] mt-1"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--t4)' }}
          >
            success
          </p>
        </div>
      </div>
    </div>
  )
}

/* ─── Analytical memo renderer ─── */
function Memo({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          return (
            <h3
              key={i}
              className="text-[11px] uppercase tracking-[0.26em] pt-6 pb-1 first:pt-0"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--t3)', borderBottom: '1px solid var(--wbd)' }}
            >
              {line.slice(3)}
            </h3>
          )
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={i} className="flex gap-3 py-0.5">
              <span className="shrink-0 mt-1 text-[10px]" style={{ color: 'var(--w3)' }}>—</span>
              <p
                className="text-[14px] leading-[1.8]"
                style={{ color: 'var(--w2)' }}
                dangerouslySetInnerHTML={{ __html: boldify(line.slice(2)) }}
              />
            </div>
          )
        }
        if (line.trim() === '') return <div key={i} className="h-2" />
        return (
          <p
            key={i}
            className="text-[14px] leading-[1.85]"
            style={{ color: 'var(--w2)' }}
            dangerouslySetInnerHTML={{ __html: boldify(line) }}
          />
        )
      })}
    </div>
  )
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

function boldify(text: string): string {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--w1);font-weight:600">$1</strong>')
}

/* ─── Section label ─── */
function SectionLabel({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 mb-8" data-r data-d="1">
      <span
        className="text-[9.5px] uppercase tracking-[0.3em]"
        style={{ fontFamily: 'var(--font-mono)', color: 'var(--t3)' }}
      >
        {n} /
      </span>
      <span
        className="text-[9.5px] uppercase tracking-[0.3em]"
        style={{ fontFamily: 'var(--font-mono)', color: 'var(--t2)' }}
      >
        {children}
      </span>
      <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, var(--bd2), transparent)' }} />
    </div>
  )
}

/* ─── Page ─── */
export default function ResultsPage() {
  const router = useRouter()
  const [result, setResult] = useState<ResultData | null>(null)

  useScrollReveal(!!result)

  useEffect(() => {
    const stored = sessionStorage.getItem('sanctions_result')
    if (!stored) { router.push('/'); return }
    try { setResult(JSON.parse(stored)) } catch { router.push('/') }
  }, [router])

  if (!result) return null

  const { query, data } = result
  const { episodes, forecast, narrative } = data

  const fatigueColor = forecast.initiator_fatigue_score > 0.65 ? '#b05a5a'
    : forecast.initiator_fatigue_score > 0.4 ? '#9a7a3a' : '#5a8a6a'
  const workaroundColor = forecast.workaround_risk > 0.65 ? '#b05a5a'
    : forecast.workaround_risk > 0.4 ? '#9a7a3a' : '#5a8a6a'

  return (
    <div>

      {/* ══ QUERY HERO ══ */}
      <section
        className="relative overflow-hidden px-8 py-16 lg:px-16"
        style={{ borderBottom: '1px solid var(--bd2)' }}
      >
        {/* Ghost watermark */}
        <span
          className="pointer-events-none absolute -top-4 right-8 select-none font-bold leading-none"
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'clamp(8rem, 20vw, 16rem)',
            color: 'rgba(107,163,192,0.03)',
          }}
        >
          ¶
        </span>

        <div className="relative max-w-4xl">
          <p
            className="mb-5 text-[9.5px] uppercase tracking-[0.3em] a-fade"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--t3)', animationDelay: '0s' }}
          >
            Scenario Analysis · {Math.round(forecast.confidence * 100)}% confidence · {episodes.length} precedents
          </p>

          <h1
            className="mb-8 font-bold leading-[1.05] tracking-tight a-up"
            style={{
              fontSize: 'clamp(1.6rem, 3.5vw, 2.8rem)',
              color: 'var(--t1)',
              animationDelay: '0.1s',
            }}
          >
            {query}
          </h1>

          <div className="flex items-center gap-3 a-up" style={{ animationDelay: '0.2s' }}>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] uppercase tracking-[0.2em] transition-all hover:opacity-70"
              style={{
                fontFamily: 'var(--font-mono)',
                color: 'var(--t2)',
                borderColor: 'var(--bd2)',
                background: 'var(--bg2)',
              }}
            >
              Export PDF
            </button>
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] uppercase tracking-[0.2em] transition-all hover:opacity-70"
              style={{
                fontFamily: 'var(--font-mono)',
                color: 'var(--t3)',
                borderColor: 'var(--bd)',
                background: 'transparent',
              }}
            >
              ← New query
            </button>
          </div>
        </div>
      </section>

      {/* ══ FORECAST ══ */}
      <section className="relative overflow-hidden px-8 py-16 lg:px-16">
        <span
          className="pointer-events-none absolute -top-6 left-4 select-none font-bold leading-none"
          style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(10rem,25vw,20rem)', color: 'rgba(107,163,192,0.025)' }}
        >
          01
        </span>

        <div className="relative max-w-4xl">
          <SectionLabel n="01">Scenario Forecast</SectionLabel>

          {/* Scenario probability rows */}
          <div className="mb-12" data-r data-d="2">
            <ScenarioRow label="Base" sublabel="status quo / stalemate" value={forecast.scenario_probs.base} accentColor="var(--t3)" />
            <ScenarioRow label="Hawkish" sublabel="escalation / pressure increase" value={forecast.scenario_probs.hawkish} accentColor="#b05a5a" />
            <ScenarioRow label="Dove" sublabel="compliance / negotiated relief" value={forecast.scenario_probs.dove} accentColor="#5a8a6a" />
            <ScenarioRow label="Backfire" sublabel="counterproductive / regime hardening" value={forecast.scenario_probs.backfire} accentColor="#9a7a3a" />
          </div>

          {/* Risk metrics row */}
          <div
            className="grid grid-cols-2 sm:grid-cols-4 mb-10"
            style={{ borderTop: '1px solid var(--bd2)', borderRight: '1px solid var(--bd2)' }}
            data-r data-d="3"
          >
            <MetricTile
              label="Initiator fatigue risk"
              value={Math.round(forecast.initiator_fatigue_score * 100)}
              unit="%"
              color={fatigueColor}
            />
            <MetricTile
              label="Workaround risk"
              value={Math.round(forecast.workaround_risk * 100)}
              unit="%"
              color={workaroundColor}
            />
            <MetricTile
              label="Expected success"
              value={Math.round(forecast.expected_success_score * 100)}
              unit="/100"
              color="var(--t2)"
            />
            <MetricTile
              label="Months to economic impact"
              value={forecast.time_to_impact_est_months ?? '—'}
              color="var(--t2)"
            />
          </div>

          {/* Wildcards */}
          {forecast.top_wildcards.length > 0 && (
            <div data-r data-d="4">
              <p
                className="mb-3 text-[9.5px] uppercase tracking-[0.28em]"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--t3)' }}
              >
                Wildcard risks
              </p>
              <div className="flex flex-wrap gap-2">
                {forecast.top_wildcards.map((w, i) => (
                  <span
                    key={i}
                    className="rounded-sm px-3 py-1.5 text-[11px]"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--t2)',
                      background: 'var(--bg2)',
                      border: '1px solid var(--bd2)',
                    }}
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ══ PRECEDENTS ══ */}
      <section
        className="relative overflow-hidden px-8 py-16 lg:px-16"
        style={{ borderTop: '1px solid var(--bd2)' }}
      >
        <span
          className="pointer-events-none absolute -top-6 left-4 select-none font-bold leading-none"
          style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(10rem,25vw,20rem)', color: 'rgba(107,163,192,0.025)' }}
        >
          02
        </span>

        <div className="relative max-w-4xl">
          <SectionLabel n="02">Matched Precedents ({episodes.length})</SectionLabel>
          <div>
            {episodes.map((ep, i) => (
              <EpisodeRow key={ep.episode_id} ep={ep} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ══ ANALYTICAL MEMO — white section ══ */}
      <section
        className="relative overflow-hidden px-8 py-16 lg:px-16"
        style={{ background: '#ffffff', color: 'var(--w1)', borderTop: '1px solid var(--wbd)' }}
      >
        <span
          className="pointer-events-none absolute -top-6 left-4 select-none font-bold leading-none"
          style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(10rem,25vw,20rem)', color: 'rgba(0,0,0,0.03)' }}
        >
          03
        </span>

        <div className="relative max-w-3xl">
          <div className="flex items-center gap-4 mb-8" data-r data-d="1">
            <span
              className="text-[9.5px] uppercase tracking-[0.3em]"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--w3)' }}
            >
              03 /
            </span>
            <span
              className="text-[9.5px] uppercase tracking-[0.3em]"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--w2)' }}
            >
              Analytical Memo
            </span>
            <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, var(--wbd), transparent)' }} />
          </div>

          <div data-r data-d="2">
            <Memo text={narrative.memo} />
          </div>

          {narrative.episode_ids_cited.length > 0 && (
            <p
              className="mt-8 text-[10px] uppercase tracking-[0.2em]"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--w3)' }}
              data-r data-d="3"
            >
              Episodes cited: {narrative.episode_ids_cited.join(' · ')}
            </p>
          )}
        </div>
      </section>

      {/* ══ LESSONS + DISCLAIMER ══ */}
      {forecast.top_lessons.length > 0 && (
        <section
          className="relative overflow-hidden px-8 py-16 lg:px-16"
          style={{ borderTop: '1px solid var(--bd2)' }}
        >
          <span
            className="pointer-events-none absolute -top-6 left-4 select-none font-bold leading-none"
            style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(10rem,25vw,20rem)', color: 'rgba(107,163,192,0.025)' }}
          >
            04
          </span>

          <div className="relative max-w-4xl">
            <SectionLabel n="04">Key Lessons from Precedents</SectionLabel>

            <div className="space-y-0">
              {forecast.top_lessons.map((lesson, i) => (
                <div
                  key={i}
                  className="flex gap-6 py-5"
                  style={{ borderBottom: '1px solid var(--bd)' }}
                  data-r
                  data-d={String(i + 2)}
                >
                  <span
                    className="text-[11px] tabular-nums shrink-0 mt-0.5"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--t4)' }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="text-[14px] leading-[1.8]" style={{ color: 'var(--t2)' }}>
                    {lesson}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══ DISCLAIMER ══ */}
      <section
        className="px-8 py-8 lg:px-16"
        style={{ borderTop: '1px solid var(--bd)' }}
      >
        <div className="max-w-4xl">
          <p
            className="text-[11px] leading-relaxed"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--t3)' }}
          >
            This analysis is generated from historical sanctions precedents and statistical models.
            It is not legal, compliance, financial, or policy advice.
            Do not rely on it as the sole basis for any decision.{' '}
            <a
              href="/terms"
              className="underline transition-opacity hover:opacity-60"
              style={{ color: 'var(--t2)' }}
            >
              Terms of Use
            </a>
          </p>
        </div>
      </section>

    </div>
  )
}
