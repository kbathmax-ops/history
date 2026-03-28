'use client'

import { useState } from 'react'
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

export default function HomePage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [multilateral, setMultilateral] = useState<string>('')
  const [sector, setSector] = useState('')
  const [intensity, setIntensity] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
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
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>

      {/* ─── SPLIT HERO ─── */}
      <section className="flex min-h-[90vh] overflow-hidden">

        {/* Left: text panel */}
        <div
          className="relative z-10 flex w-full flex-col justify-between px-10 py-16 lg:w-[46%] lg:px-16"
          style={{ background: 'var(--bg)' }}
        >
          {/* Top label */}
          <p
            className="text-[9px] uppercase tracking-[0.3em] anim-slide"
            style={{
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              animationDelay: '0s',
            }}
          >
            Economic Statecraft · Intelligence Platform
          </p>

          {/* Centre: headline */}
          <div>
            <h1
              className="font-light italic leading-[0.9] tracking-tight anim-reveal"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(3.5rem, 6vw, 6rem)',
                color: 'var(--text)',
                animationDelay: '0.1s',
              }}
            >
              Mapping
              <br />
              <span className="not-italic font-semibold">the weight</span>
              <br />
              of pressure.
            </h1>

            <p
              className="mt-8 max-w-[28ch] text-[14px] leading-[1.85] anim-reveal"
              style={{
                fontFamily: 'var(--font-sans)',
                color: 'var(--text-dim)',
                animationDelay: '0.22s',
              }}
            >
              Retrieve the most similar historical sanctions episodes, compute
              scenario probabilities, and generate a structured analytical memo.
            </p>

            <button
              onClick={() =>
                document.getElementById('form-section')?.scrollIntoView({ behavior: 'smooth' })
              }
              className="mt-10 flex items-center gap-3 group anim-slide"
              style={{ animationDelay: '0.35s' }}
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-300 group-hover:scale-110"
                style={{
                  borderColor: 'var(--accent-dim)',
                  color: 'var(--accent)',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 6h10M6 1l5 5-5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <span
                className="text-[11px] uppercase tracking-[0.22em] transition-colors group-hover:opacity-100"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}
              >
                Analyze a scenario
              </span>
            </button>
          </div>

          {/* Bottom: coordinates */}
          <div
            className="flex items-center gap-6 anim-slide"
            style={{ animationDelay: '0.45s' }}
          >
            <span
              className="text-[9px] uppercase tracking-[0.22em]"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}
            >
              78°N · Arctic Circle
            </span>
            <span style={{ color: 'var(--border)' }}>—</span>
            <span
              className="text-[9px] uppercase tracking-[0.22em]"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}
            >
              Geopolitical Frontier
            </span>
          </div>
        </div>

        {/* Right: full-height image */}
        <div className="relative hidden flex-1 overflow-hidden lg:block anim-scale" style={{ animationDelay: '0s' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1520769945061-0a448c463865?w=1400&q=85&fit=crop"
            alt="Arctic landscape"
            className="h-full w-full object-cover object-center"
          />
          {/* left bleed gradient */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to right, var(--bg) 0%, var(--bg)/60 18%, transparent 50%)',
            }}
          />
          {/* bottom label */}
          <div className="absolute bottom-6 right-7">
            <p
              className="text-[8px] uppercase tracking-[0.3em]"
              style={{ fontFamily: 'var(--font-mono)', color: 'rgba(220,228,238,0.3)' }}
            >
              Svalbard Archipelago
            </p>
          </div>
        </div>
      </section>

      {/* ─── THIN META STRIP ─── */}
      <div
        className="flex items-center justify-between px-10 py-3 lg:px-16"
        style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
      >
        <span
          className="text-[8px] uppercase tracking-[0.28em]"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}
        >
          Precedent database · Historical episode retrieval
        </span>
        <span
          className="text-[8px] uppercase tracking-[0.28em]"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}
        >
          Probabilistic scenario forecasting
        </span>
      </div>

      {/* ─── FORM SECTION ─── */}
      <section id="form-section" className="px-10 py-24 lg:px-16">
        <div className="mx-auto max-w-2xl">

          {/* Section heading */}
          <div className="mb-16">
            <p
              className="mb-6 text-[9px] uppercase tracking-[0.3em]"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}
            >
              Scenario input
            </p>
            <h2
              className="font-light italic leading-[0.95] tracking-tight"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.4rem, 4.5vw, 4rem)',
                color: 'var(--text)',
              }}
            >
              Describe the
              <br />
              <span className="not-italic font-medium">scenario.</span>
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-14">

            {/* Query */}
            <div>
              <label
                className="mb-5 block text-[9px] uppercase tracking-[0.28em]"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}
              >
                Scenario query
              </label>
              <textarea
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Describe the sanctions scenario — target country, initiators, objectives, instruments..."
                rows={5}
                maxLength={1000}
                className="w-full resize-none border-0 bg-transparent px-0 py-3 text-[15px] leading-[1.9] placeholder-[#1e2c3a] focus:outline-none transition-colors"
                style={{
                  fontFamily: 'var(--font-sans)',
                  color: 'var(--text)',
                  borderBottom: '1px solid var(--border)',
                }}
                onFocus={e => { e.currentTarget.style.borderBottomColor = 'var(--accent-dim)' }}
                onBlur={e => { e.currentTarget.style.borderBottomColor = 'var(--border)' }}
              />
              <div className="mt-2 flex justify-end">
                <span
                  className="text-[10px]"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}
                >
                  {query.length}/1000
                </span>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-3 gap-10">
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
                    className="mb-5 block text-[9px] uppercase tracking-[0.28em]"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}
                  >
                    {label}
                  </label>
                  <select
                    value={value}
                    onChange={e => setter(e.target.value)}
                    className="w-full appearance-none border-0 bg-transparent px-0 py-2 text-[13px] focus:outline-none cursor-pointer transition-colors"
                    style={{
                      fontFamily: 'var(--font-sans)',
                      color: 'var(--text)',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {options.map(o => (
                      <option key={o.value} value={o.value} style={{ background: '#06090f' }}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {error && (
              <p
                className="border-l pl-4 text-[13px]"
                style={{
                  fontFamily: 'var(--font-mono)',
                  borderColor: '#7f3a3a',
                  color: '#c07070',
                }}
              >
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!query.trim() || loading}
              className="group flex items-center gap-4 transition-opacity disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-300 group-hover:scale-105 group-enabled:group-hover:border-[var(--accent)]"
                style={{ borderColor: 'var(--accent-dim)', color: 'var(--accent)' }}
              >
                {loading ? (
                  <span className="text-xs animate-pulse">…</span>
                ) : (
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M1 6h10M6 1l5 5-5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </span>
              <span
                className="text-[11px] uppercase tracking-[0.24em] transition-colors"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}
              >
                {loading ? 'Analyzing precedents…' : 'Analyze scenario'}
              </span>
            </button>
          </form>

          {/* Example queries */}
          <div
            className="mt-20 pt-12"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <p
              className="mb-8 text-[9px] uppercase tracking-[0.3em]"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}
            >
              Example queries
            </p>
            <div>
              {EXAMPLE_QUERIES.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(q)}
                  className="group block w-full border-b py-4 text-left text-[13px] leading-relaxed transition-colors last:border-0"
                  style={{
                    fontFamily: 'var(--font-sans)',
                    color: 'var(--text-dim)',
                    borderColor: 'var(--border)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)' }}
                >
                  <span
                    className="mr-3 text-[10px] transition-colors"
                    style={{ color: 'var(--text-muted)' }}
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

      {/* ─── OCEAN IMAGE STRIP ─── */}
      <section
        className="relative overflow-hidden"
        style={{ height: 'clamp(280px, 40vh, 520px)' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1800&q=85&fit=crop"
          alt="Open ocean — international maritime pressure"
          className="h-full w-full object-cover object-center"
          style={{ filter: 'brightness(0.55) saturate(0.7)' }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, var(--bg) 0%, transparent 20%, transparent 80%, var(--bg) 100%)',
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center px-8">
          <p
            className="select-none text-center font-light italic leading-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.6rem, 5vw, 4rem)',
              color: 'rgba(220,228,238,0.06)',
              letterSpacing: '0.04em',
            }}
          >
            precedent · pressure · consequence
          </p>
        </div>
        <div
          className="absolute bottom-5 left-0 right-0 flex justify-center"
        >
          <p
            className="text-[8px] uppercase tracking-[0.3em]"
            style={{ fontFamily: 'var(--font-mono)', color: 'rgba(220,228,238,0.18)' }}
          >
            North Atlantic · International Waters
          </p>
        </div>
      </section>

    </div>
  )
}
