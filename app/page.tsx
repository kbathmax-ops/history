'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

/* ─── Data ─── */
const SECTORS = [
  { value: '', label: 'All sectors' },
  { value: 'energy', label: 'Energy / Oil' },
  { value: 'finance', label: 'Finance / Banking' },
  { value: 'defense_nuclear', label: 'Defense / Nuclear' },
  { value: 'technology', label: 'Technology / Export controls' },
  { value: 'comprehensive', label: 'Comprehensive' },
  { value: 'trade', label: 'Trade' },
]

const INTENSITIES = [
  { value: '', label: 'Any intensity' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical (SWIFT-level)' },
]

const EXAMPLE_QUERIES = [
  'Unilateral US sanctions on a mid-size petrostate with Chinese economic ties',
  'Multilateral tech export controls against a nuclear-armed state',
  'Comprehensive EU and US sanctions targeting an authoritarian government after election fraud',
  'Arms embargo on a country receiving Russian military support',
  'SWIFT disconnection and energy sanctions on a major oil exporter',
]

const TICKER_ITEMS = [
  'Iran · Nuclear Programme 2012',
  'Russia · SWIFT Exclusion 2022',
  'North Korea · Export Controls',
  'Cuba · Comprehensive Embargo 1962',
  'Myanmar · Arms Embargo 2021',
  'Venezuela · Oil Sector 2019',
  'Iraq · Gulf War Regime 1990',
  'Libya · Gaddafi Regime 2011',
  'Zimbabwe · Mugabe Era 2002',
  'Syria · Civil War Measures 2011',
  'Belarus · Lukashenko 2021',
  'South Africa · Apartheid Era',
  'Sudan · Darfur Conflict',
  'Afghanistan · Taliban 2001',
]

/* ─── Hooks ─── */
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-r]')
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis') }),
      { threshold: 0.12 }
    )
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}

function useParallax(ref: React.RefObject<HTMLDivElement | null>, strength = 40) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const img = el.querySelector('img') as HTMLImageElement | null
    if (!img) return
    const onScroll = () => {
      const rect = el.getBoundingClientRect()
      const center = rect.top + rect.height / 2
      const vc = window.innerHeight / 2
      const pct = (center - vc) / (window.innerHeight + rect.height)
      img.style.transform = `translateY(${pct * strength * 2}px) scale(1.1)`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [ref, strength])
}

/* ─── Sub-components ─── */
function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS]
  return (
    <div
      className="overflow-hidden py-3"
      style={{ borderTop: '1px solid var(--bd)', borderBottom: '1px solid var(--bd)' }}
    >
      <div className="ticker-track">
        {items.map((item, i) => (
          <span
            key={i}
            className="flex items-center shrink-0"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--t3)', fontSize: '10px' }}
          >
            <span className="uppercase tracking-[0.22em] px-6 whitespace-nowrap">{item}</span>
            <span style={{ color: 'var(--bd2)' }}>·</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function ParallaxOcean() {
  const ref = useRef<HTMLDivElement>(null)
  useParallax(ref, 35)
  return (
    <div
      ref={ref}
      className="relative overflow-hidden"
      style={{ height: 'clamp(300px, 42vh, 560px)' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1800&q=85&fit=crop"
        alt="Open ocean"
        className="h-[120%] w-full object-cover object-center"
        style={{ marginTop: '-5%', filter: 'brightness(0.45) saturate(0.65)' }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, var(--bg) 0%, transparent 22%, transparent 78%, var(--bg) 100%)',
        }}
      />
      {/* Ghost text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <p
          className="select-none text-center font-light italic"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem, 5.5vw, 5rem)',
            color: 'rgba(221,234,246,0.055)',
            letterSpacing: '0.05em',
            lineHeight: 1.2,
          }}
        >
          precedent
          <br />
          <span className="not-italic font-medium">pressure</span>
          <br />
          consequence
        </p>
      </div>
      <div className="absolute bottom-6 left-0 right-0 flex justify-center">
        <p
          className="text-[8px] uppercase tracking-[0.32em]"
          style={{ fontFamily: 'var(--font-mono)', color: 'rgba(141,182,204,0.35)' }}
        >
          North Atlantic · International Waters
        </p>
      </div>
    </div>
  )
}

/* ─── Main page ─── */
export default function HomePage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [multilateral, setMultilateral] = useState('')
  const [sector, setSector] = useState('')
  const [intensity, setIntensity] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useScrollReveal()

  const scrollToForm = useCallback(() => {
    document.getElementById('form-section')?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setSubmitting(true)
    setError('')
    try {
      const filters: Record<string, unknown> = {}
      if (multilateral === 'true') filters.multilateral = true
      if (multilateral === 'false') filters.multilateral = false
      if (sector) filters.sector = sector
      if (intensity) filters.enforcement_intensity = intensity

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), filters }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Request failed')
      }
      const data = await res.json()
      sessionStorage.setItem('sanctions_result', JSON.stringify({ query, data }))
      router.push('/results')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>

      {/* ══════════════════════════════════════════
          HERO — split viewport
      ══════════════════════════════════════════ */}
      <section className="flex min-h-[90vh] overflow-hidden">

        {/* Left panel */}
        <div
          className="scanline relative z-10 flex w-full flex-col justify-between overflow-hidden px-10 py-16 lg:w-[44%] lg:px-16"
          style={{ background: 'var(--bg)' }}
        >
          {/* Top: label */}
          <p
            className="a-left text-[9px] uppercase tracking-[0.32em]"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--t3)', animationDelay: '0s' }}
          >
            Economic Statecraft · Intelligence Platform
          </p>

          {/* Centre: headline + body + CTA */}
          <div>
            <h1
              className="a-up font-light italic leading-[0.88] tracking-tight"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(3.8rem, 6.5vw, 7rem)',
                color: 'var(--t1)',
                animationDelay: '0.08s',
              }}
            >
              Mapping
              <br />
              <span className="not-italic font-semibold">the weight</span>
              <br />
              of pressure.
            </h1>

            <p
              className="a-up mt-9 max-w-[30ch] text-[14.5px] leading-[1.9]"
              style={{
                fontFamily: 'var(--font-sans)',
                color: 'var(--t2)',
                animationDelay: '0.2s',
              }}
            >
              Retrieve the most similar historical sanctions episodes, compute
              scenario probabilities, and generate a structured analytical memo.
            </p>

            <button
              onClick={scrollToForm}
              className="a-up mt-11 flex items-center gap-3 group"
              style={{ animationDelay: '0.32s' }}
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-all duration-400 group-hover:scale-105 group-hover:bg-[var(--ac-glo)]"
                style={{ borderColor: 'var(--ac-dim)', color: 'var(--ac)' }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M1 6h10M6 1l5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span
                className="text-[11px] uppercase tracking-[0.24em] transition-colors group-hover:text-[var(--t1)]"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--ac)' }}
              >
                Analyze a scenario
              </span>
            </button>
          </div>

          {/* Bottom: coordinates */}
          <div
            className="a-fade flex items-center gap-5"
            style={{ animationDelay: '0.5s' }}
          >
            <span
              className="text-[8.5px] uppercase tracking-[0.24em]"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--t4)' }}
            >
              78°N Arctic Circle
            </span>
            <span style={{ color: 'var(--bd2)' }}>—</span>
            <span
              className="text-[8.5px] uppercase tracking-[0.24em]"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--t4)' }}
            >
              Geopolitical frontier
            </span>
          </div>
        </div>

        {/* Right panel: arctic photo */}
        <div className="a-img relative hidden flex-1 overflow-hidden lg:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1520769945061-0a448c463865?w=1400&q=85&fit=crop"
            alt="Arctic landscape"
            className="h-full w-full object-cover object-center transition-transform duration-[0ms]"
          />
          {/* left fade into dark panel */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to right, var(--bg) 0%, rgba(6,9,15,0.45) 22%, transparent 55%)',
            }}
          />
          {/* top vignette */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, var(--bg)/30 0%, transparent 18%)',
            }}
          />
          {/* bottom-right caption */}
          <div className="absolute bottom-6 right-7">
            <p
              className="text-[8px] uppercase tracking-[0.32em]"
              style={{ fontFamily: 'var(--font-mono)', color: 'rgba(141,182,204,0.35)' }}
            >
              Svalbard Archipelago
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          TICKER
      ══════════════════════════════════════════ */}
      <Ticker />

      {/* ══════════════════════════════════════════
          FORM
      ══════════════════════════════════════════ */}
      <section id="form-section" className="relative px-10 py-28 lg:px-16">

        {/* Ghost watermark "01" */}
        <span
          className="pointer-events-none absolute -top-6 left-6 select-none font-semibold leading-none"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(12rem, 28vw, 22rem)',
            color: 'rgba(107,163,192,0.025)',
          }}
        >
          01
        </span>

        <div className="relative mx-auto max-w-2xl">

          {/* Section header */}
          <div
            className="mb-16"
            data-r
            data-d="1"
          >
            <div className="mb-6 flex items-center gap-4">
              <span
                className="text-[9px] uppercase tracking-[0.32em]"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--t3)' }}
              >
                Scenario input
              </span>
              <div
                className="h-px flex-1"
                style={{ background: 'linear-gradient(to right, var(--bd2), transparent)' }}
              />
            </div>
            <h2
              className="font-light italic leading-[0.93] tracking-tight"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.6rem, 5vw, 4.2rem)',
                color: 'var(--t1)',
              }}
            >
              Describe the
              <br />
              <span className="not-italic font-semibold">scenario.</span>
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-14">

            {/* Query textarea */}
            <div data-r data-d="2">
              <label
                className="mb-5 block text-[9px] uppercase tracking-[0.28em]"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--t3)' }}
              >
                Scenario query
              </label>
              <div className="field-line">
                <textarea
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Target country, initiating parties, objectives, instruments…"
                  rows={5}
                  maxLength={1000}
                  className="w-full resize-none border-0 bg-transparent px-0 py-3 text-[15px] leading-[1.9] focus:outline-none"
                  style={{
                    fontFamily: 'var(--font-sans)',
                    color: 'var(--t1)',
                    caretColor: 'var(--ac)',
                  }}
                />
              </div>
              <div className="mt-2 flex justify-between">
                <span style={{ color: 'var(--t4)', fontFamily: 'var(--font-mono)', fontSize: '9px' }}>
                  {query.length > 0 ? `${query.length} chars` : ''}
                </span>
                <span
                  className="text-[10px]"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--t4)' }}
                >
                  {query.length}/1000
                </span>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-3 gap-10" data-r data-d="3">
              {[
                {
                  label: 'Coalition',
                  value: multilateral,
                  setter: setMultilateral,
                  options: [
                    { value: '', label: 'Any' },
                    { value: 'true', label: 'Multilateral' },
                    { value: 'false', label: 'Unilateral' },
                  ],
                },
                { label: 'Sector', value: sector, setter: setSector, options: SECTORS },
                { label: 'Intensity', value: intensity, setter: setIntensity, options: INTENSITIES },
              ].map(({ label, value, setter, options }) => (
                <div key={label}>
                  <label
                    className="mb-4 block text-[9px] uppercase tracking-[0.28em]"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--t3)' }}
                  >
                    {label}
                  </label>
                  <div className="field-line">
                    <select
                      value={value}
                      onChange={e => setter(e.target.value)}
                      className="w-full appearance-none border-0 bg-transparent px-0 py-2 text-[13px] focus:outline-none cursor-pointer"
                      style={{ fontFamily: 'var(--font-sans)', color: 'var(--t1)' }}
                    >
                      {options.map(o => (
                        <option key={o.value} value={o.value} style={{ background: '#06090f' }}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <p
                className="border-l-2 pl-4 text-[13px]"
                style={{
                  fontFamily: 'var(--font-mono)',
                  borderColor: '#7a3535',
                  color: '#c08080',
                }}
              >
                {error}
              </p>
            )}

            {/* Submit */}
            <div data-r data-d="4">
              <button
                type="submit"
                disabled={!query.trim() || loading}
                className="group flex items-center gap-4 disabled:opacity-20 disabled:cursor-not-allowed transition-opacity"
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-full border transition-all duration-300 group-enabled:group-hover:scale-105 group-enabled:group-hover:border-[var(--ac)] group-enabled:group-hover:bg-[var(--ac-glo)] ${submitting && !error ? 'pulse' : ''}`}
                  style={{ borderColor: 'var(--ac-dim)', color: 'var(--ac)' }}
                >
                  {loading ? (
                    <span className="animate-pulse text-sm" style={{ color: 'var(--ac)' }}>…</span>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M1 6h10M6 1l5 5-5 5"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span
                  className="text-[11px] uppercase tracking-[0.26em] transition-colors group-enabled:group-hover:text-[var(--t1)]"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--t2)' }}
                >
                  {loading ? 'Analyzing precedents…' : 'Analyze scenario'}
                </span>
              </button>
            </div>
          </form>

          {/* ── Example queries ── */}
          <div
            className="mt-24 pt-12"
            style={{ borderTop: '1px solid var(--bd)' }}
          >
            <div className="mb-8 flex items-center gap-4" data-r data-d="1">
              <span
                className="text-[9px] uppercase tracking-[0.32em]"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--t3)' }}
              >
                Example queries
              </span>
              <div
                className="h-px flex-1"
                style={{ background: 'linear-gradient(to right, var(--bd2), transparent)' }}
              />
            </div>
            <div>
              {EXAMPLE_QUERIES.map((q, i) => (
                <button
                  key={i}
                  onClick={() => { setQuery(q); scrollToForm() }}
                  className="group block w-full border-b py-4 text-left text-[13.5px] leading-relaxed transition-all last:border-0"
                  style={{
                    borderColor: 'var(--bd)',
                    color: 'var(--t3)',
                    fontFamily: 'var(--font-sans)',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t1)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t3)' }}
                  data-r
                  data-d={String(i + 2)}
                >
                  <span
                    className="mr-3 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--ac)' }}
                  >
                    ↗
                  </span>
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          OCEAN STRIP (parallax)
      ══════════════════════════════════════════ */}
      <ParallaxOcean />

    </div>
  )
}
