'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

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
  'Cuba · Comprehensive Embargo',
  'Myanmar · Arms Embargo 2021',
  'Venezuela · Oil Sector 2019',
  'Iraq · Gulf War Regime 1990',
  'Libya · Gaddafi Regime 2011',
  'Zimbabwe · Mugabe Era 2002',
  'Syria · Civil War 2011',
  'Belarus · Lukashenko 2021',
  'South Africa · Apartheid Era',
]

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-r]')
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis') }),
      { threshold: 0.1 }
    )
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}

function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS]
  return (
    <div
      className="overflow-hidden py-2.5"
      style={{ borderTop: '1px solid var(--bd)', borderBottom: '1px solid var(--bd)' }}
    >
      <div className="ticker-track">
        {items.map((item, i) => (
          <span
            key={i}
            className="flex items-center shrink-0"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--t3)', fontSize: '9.5px' }}
          >
            <span className="uppercase tracking-[0.2em] px-5 whitespace-nowrap">{item}</span>
            <span style={{ color: 'var(--bd2)' }}>·</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [multilateral, setMultilateral] = useState('')
  const [sector, setSector] = useState('')
  const [intensity, setIntensity] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

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

      let json: Record<string, unknown>
      try {
        json = await res.json()
      } catch {
        throw new Error('Server returned an unexpected response. Please try again.')
      }

      if (!res.ok) {
        throw new Error((json.error as string) ?? 'Request failed')
      }

      const data = json
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

      {/* ════════════════════════════════════════
          HERO — full-width image, text below
      ════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ minHeight: '82vh' }}>

        {/* Background image + gradient overlay */}
        <div
          className="a-scale absolute inset-0"
          style={{
            backgroundImage: [
              'linear-gradient(to bottom, rgba(6,11,18,0.25) 0%, rgba(6,11,18,0.55) 55%, rgba(6,11,18,1) 100%)',
              'radial-gradient(ellipse at 30% 50%, rgba(18,55,90,0.55) 0%, transparent 65%)',
              "url('https://images.unsplash.com/photo-1551009175-8a68da93d5f9?w=1800&q=85&fit=crop&crop=entropy')",
            ].join(', '),
            backgroundSize: 'auto, auto, cover',
            backgroundPosition: 'center, center, center',
            backgroundColor: 'var(--bg)',
          }}
        />

        {/* Hero content — bottom-anchored, text over image */}
        <div
          className="relative z-10 flex flex-col justify-end px-8 lg:px-16"
          style={{ minHeight: '82vh', paddingBottom: '5rem' }}
        >
          {/* Top label */}
          <p
            className="a-fade mb-8 text-[11px] uppercase tracking-[0.28em]"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--t2)', animationDelay: '0.1s' }}
          >
            Economic Statecraft · Precedent Database
          </p>

          {/* Headline */}
          <h1
            className="a-up max-w-4xl leading-[0.92] tracking-tight"
            style={{
              fontSize: 'clamp(3.5rem, 8vw, 8.5rem)',
              fontWeight: 800,
              color: 'var(--t1)',
              animationDelay: '0.15s',
            }}
          >
            <span style={{ fontWeight: 300 }}>Mapping</span>{' '}
            <span style={{ color: 'var(--t1)' }}>the weight</span>
            <br />
            <span style={{ fontWeight: 300, color: 'var(--t2)' }}>of pressure.</span>
          </h1>

          {/* Subtitle + CTA row */}
          <div
            className="a-up mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
            style={{ animationDelay: '0.28s' }}
          >
            <p
              className="max-w-[40ch] text-[15px] leading-[1.8]"
              style={{ color: 'var(--t2)' }}
            >
              Retrieve historical sanctions episodes, compute scenario probabilities,
              and generate structured analytical memos.
            </p>

            <button
              onClick={scrollToForm}
              className="group flex shrink-0 items-center gap-3"
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-300 group-hover:scale-105 group-hover:bg-[var(--ac-glo)]"
                style={{ borderColor: 'var(--ac-dim)', color: 'var(--ac)' }}
              >
                <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1v10M1 6l5 5 5-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <span
                className="text-[11px] uppercase tracking-[0.24em]"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--ac)' }}
              >
                Analyze a scenario
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          TICKER
      ════════════════════════════════════════ */}
      <Ticker />

      {/* ════════════════════════════════════════
          FORM SECTION — white card slides up
      ════════════════════════════════════════ */}
      <section
        id="form-section"
        style={{
          background: '#ffffff',
          color: 'var(--w1)',
        }}
      >
        <div className="mx-auto max-w-2xl px-8 py-16 lg:px-6">

          {/* Header */}
          <div className="mb-10" data-r data-d="1">
            <p
              className="mb-4 text-[9.5px] uppercase tracking-[0.3em]"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--w3)' }}
            >
              Scenario input
            </p>
            <h2
              className="leading-[1] tracking-tight"
              style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)', fontWeight: 700, color: 'var(--w1)' }}
            >
              Describe the
              <br />
              <span style={{ fontWeight: 300 }}>scenario.</span>
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">

            {/* Query */}
            <div data-r data-d="2">
              <label
                className="mb-4 block text-[9.5px] uppercase tracking-[0.28em]"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--w3)' }}
              >
                Scenario query
              </label>
              <div className="field">
                <textarea
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Target country, initiating parties, objectives, instruments…"
                  rows={4}
                  maxLength={1000}
                  className="w-full resize-none border-0 bg-transparent px-0 py-3 text-[15px] leading-[1.85] focus:outline-none"
                  style={{
                    color: 'var(--w1)',
                    caretColor: 'var(--ac)',
                  }}
                />
              </div>
              <div className="mt-1.5 flex justify-end">
                <span
                  className="text-[10px]"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--w3)' }}
                >
                  {query.length}/1000
                </span>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-3 gap-8" data-r data-d="3">
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
                    className="mb-3 block text-[9.5px] uppercase tracking-[0.28em]"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--w3)' }}
                  >
                    {label}
                  </label>
                  <div className="field">
                    <select
                      value={value}
                      onChange={e => setter(e.target.value)}
                      className="w-full appearance-none border-0 bg-transparent px-0 py-2 text-[13px] focus:outline-none cursor-pointer"
                      style={{ color: 'var(--w1)' }}
                    >
                      {options.map(o => (
                        <option key={o.value} value={o.value} style={{ background: '#fff' }}>
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
                style={{ borderColor: '#c08080', color: '#9a4a4a', fontFamily: 'var(--font-mono)' }}
              >
                {error}
              </p>
            )}

            {/* Submit */}
            <div data-r data-d="4">
              <button
                type="submit"
                disabled={!query.trim() || loading}
                className="group flex items-center gap-4 disabled:opacity-25 disabled:cursor-not-allowed transition-opacity"
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-full border transition-all duration-300 group-enabled:group-hover:scale-105 group-enabled:group-hover:bg-[var(--ac-glo)] ${submitting && !error ? 'pulse' : ''}`}
                  style={{ borderColor: 'var(--ac-dim)', color: 'var(--ac)' }}
                >
                  {loading ? (
                    <span className="animate-pulse text-sm" style={{ color: 'var(--ac)' }}>…</span>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
                      <path d="M1 6h10M6 1l5 5-5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
                <span
                  className="text-[11px] uppercase tracking-[0.24em] transition-colors group-enabled:group-hover:opacity-80"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--w2)' }}
                >
                  {loading ? 'Analyzing precedents…' : 'Analyze scenario'}
                </span>
              </button>
            </div>
          </form>

          {/* Example queries */}
          <div className="mt-14 pt-10" style={{ borderTop: '1px solid var(--wbd)' }}>
            <p
              className="mb-6 text-[9.5px] uppercase tracking-[0.3em]"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--w3)' }}
              data-r data-d="1"
            >
              Example queries
            </p>
            {EXAMPLE_QUERIES.map((q, i) => (
              <button
                key={i}
                onClick={() => { setQuery(q); scrollToForm() }}
                className="group block w-full border-b py-3.5 text-left text-[13.5px] leading-relaxed transition-colors last:border-0"
                style={{ borderColor: 'var(--wbd)', color: 'var(--w3)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--w1)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--w3)' }}
                data-r
                data-d={String(i + 2)}
              >
                <span
                  className="mr-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
                  style={{ color: 'var(--ac)' }}
                >
                  ↗
                </span>
                {q}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          OCEAN STRIP — dark atmospheric
      ════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{ height: 'clamp(280px, 38vh, 500px)' }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: [
              'linear-gradient(to bottom, var(--bg) 0%, rgba(6,11,18,0.2) 30%, rgba(6,11,18,0.2) 70%, var(--bg) 100%)',
              'radial-gradient(ellipse at 60% 40%, rgba(15,50,85,0.5) 0%, transparent 65%)',
              "url('https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1800&q=80&fit=crop')",
            ].join(', '),
            backgroundSize: 'auto, auto, cover',
            backgroundPosition: 'center, center, center',
            backgroundColor: '#060d1a',
            filter: 'saturate(0.6) brightness(0.7)',
          }}
        />
        <div
          className="relative z-10 flex h-full flex-col items-center justify-center px-8 text-center"
          style={{ filter: 'saturate(1) brightness(1)' }}
        >
          <p
            className="select-none leading-[1.1] tracking-tight"
            style={{
              fontSize: 'clamp(2rem, 5vw, 5rem)',
              fontWeight: 700,
              color: 'rgba(221,234,246,0.07)',
            }}
          >
            precedent
            <br />
            <span style={{ fontWeight: 300 }}>pressure</span>
            <br />
            consequence
          </p>
          <p
            className="mt-8 text-[8.5px] uppercase tracking-[0.32em]"
            style={{ fontFamily: 'var(--font-mono)', color: 'rgba(141,182,204,0.32)' }}
          >
            North Atlantic · International Waters
          </p>
        </div>
      </section>

    </div>
  )
}
