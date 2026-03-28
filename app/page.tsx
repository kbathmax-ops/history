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
      {/* ── Hero — light/off-white editorial section ── */}
      <section className="bg-[#f0ede8] text-[#0c0c0c] overflow-hidden">
        <div className="max-w-7xl mx-auto px-8 pt-20 pb-0">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.7fr] gap-12 lg:gap-20 items-end pb-20">

            {/* Left: description */}
            <div
              className="animate-fade-in-up"
              style={{ animationDelay: '0.05s' }}
            >
              <p
                className="text-[9px] uppercase tracking-[0.28em] text-[#9a958e] mb-10"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Economic statecraft · Precedent database
              </p>
              <p className="text-[15px] text-[#6b665f] leading-[1.75] mb-10 max-w-[280px]">
                Retrieve the most similar historical sanctions episodes, compute scenario
                probabilities, and generate structured analytical memos.
              </p>
              <button
                onClick={() =>
                  document.getElementById('form-section')?.scrollIntoView({ behavior: 'smooth' })
                }
                className="flex items-center gap-2 text-[13px] text-[#0c0c0c] hover:gap-5 transition-all duration-300 group"
              >
                <span className="text-base">→</span>
                <span
                  className="border-b border-[#0c0c0c]/25 pb-px"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  Run a scenario
                </span>
              </button>
            </div>

            {/* Right: big display heading */}
            <div
              className="animate-fade-in-up"
              style={{ animationDelay: '0.18s' }}
            >
              <h1
                className="font-medium tracking-tight leading-[0.92] text-[#0c0c0c]"
                style={{
                  fontFamily: 'var(--font-playfair)',
                  fontSize: 'clamp(3.2rem, 7.5vw, 6.5rem)',
                }}
              >
                Mapping the
                <br />
                <em>geography</em>
                <br />
                of pressure.
              </h1>
            </div>
          </div>
        </div>
      </section>

      {/* ── Full-bleed wilderness image — Arctic ── */}
      <section
        className="relative overflow-hidden animate-fade-in"
        style={{ height: 'clamp(340px, 55vh, 680px)', animationDelay: '0.35s' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1800&q=85&fit=crop"
          alt="Arctic ice — geopolitical frontier"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#f0ede8]/15 via-transparent to-[#0c0c0c]/75" />
        <div className="absolute bottom-7 left-8 right-8 flex justify-between items-end">
          <p
            className="text-[9px] text-[#f0ede8]/50 uppercase tracking-[0.25em]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Arctic Circle — 78° N
          </p>
          <p
            className="text-[9px] text-[#f0ede8]/35 uppercase tracking-[0.2em]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Geopolitical frontier
          </p>
        </div>
      </section>

      {/* ── Form section — dark ── */}
      <section id="form-section" className="bg-[#0c0c0c] py-24 px-8">
        <div className="max-w-3xl mx-auto">

          <div className="mb-16">
            <p
              className="text-[9px] uppercase tracking-[0.28em] text-[#383838] mb-7"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Scenario analysis
            </p>
            <h2
              className="font-medium tracking-tight text-[#f0ede8]"
              style={{
                fontFamily: 'var(--font-playfair)',
                fontSize: 'clamp(2.2rem, 4.5vw, 3.8rem)',
                lineHeight: 1.05,
              }}
            >
              Describe the<br />
              <em>scenario.</em>
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-12">

            {/* Query textarea */}
            <div>
              <label
                className="block text-[9px] text-[#3d3d3d] uppercase tracking-[0.25em] mb-5"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Scenario query
              </label>
              <textarea
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Describe the sanctions scenario — target country, initiators, objectives, instruments..."
                rows={5}
                className="w-full bg-transparent border-0 border-b border-[#252525] focus:border-[#4a4a4a] px-0 py-3 text-[#dedad4] placeholder-[#282828] focus:outline-none resize-none text-[15px] leading-[1.8] transition-colors"
                style={{ fontFamily: 'var(--font-syne)' }}
                maxLength={1000}
              />
              <div className="flex justify-end mt-2">
                <span
                  className="text-[10px] text-[#282828]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {query.length}/1000
                </span>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-3 gap-10">
              <div>
                <label
                  className="block text-[9px] text-[#3d3d3d] uppercase tracking-[0.25em] mb-5"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  Coalition
                </label>
                <select
                  value={multilateral}
                  onChange={e => setMultilateral(e.target.value)}
                  className="w-full bg-transparent border-0 border-b border-[#252525] focus:border-[#4a4a4a] px-0 py-2 text-[#dedad4] focus:outline-none text-[13px] transition-colors appearance-none cursor-pointer"
                  style={{ fontFamily: 'var(--font-syne)' }}
                >
                  <option value="" className="bg-[#111]">Any</option>
                  <option value="true" className="bg-[#111]">Multilateral</option>
                  <option value="false" className="bg-[#111]">Unilateral</option>
                </select>
              </div>

              <div>
                <label
                  className="block text-[9px] text-[#3d3d3d] uppercase tracking-[0.25em] mb-5"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  Sector
                </label>
                <select
                  value={sector}
                  onChange={e => setSector(e.target.value)}
                  className="w-full bg-transparent border-0 border-b border-[#252525] focus:border-[#4a4a4a] px-0 py-2 text-[#dedad4] focus:outline-none text-[13px] transition-colors appearance-none cursor-pointer"
                  style={{ fontFamily: 'var(--font-syne)' }}
                >
                  {SECTORS.map(s => (
                    <option key={s.value} value={s.value} className="bg-[#111]">{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  className="block text-[9px] text-[#3d3d3d] uppercase tracking-[0.25em] mb-5"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  Intensity
                </label>
                <select
                  value={intensity}
                  onChange={e => setIntensity(e.target.value)}
                  className="w-full bg-transparent border-0 border-b border-[#252525] focus:border-[#4a4a4a] px-0 py-2 text-[#dedad4] focus:outline-none text-[13px] transition-colors appearance-none cursor-pointer"
                  style={{ fontFamily: 'var(--font-syne)' }}
                >
                  {INTENSITIES.map(i => (
                    <option key={i.value} value={i.value} className="bg-[#111]">{i.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <p
                className="text-red-400/70 text-[13px] border-l border-red-800/40 pl-4"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!query.trim() || loading}
              className="group flex items-center gap-4 text-[#f0ede8] disabled:opacity-25 disabled:cursor-not-allowed transition-opacity"
            >
              <span className="w-11 h-11 border border-[#2e2e2e] rounded-full flex items-center justify-center group-hover:border-[#555] group-hover:bg-[#161616] transition-all">
                {loading ? (
                  <span className="text-xs text-[#555] animate-pulse">…</span>
                ) : (
                  <span className="text-xs text-[#888] group-hover:text-[#f0ede8] transition-colors">→</span>
                )}
              </span>
              <span
                className="text-[13px] tracking-widest uppercase text-[#888] group-hover:text-[#f0ede8] transition-colors"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {loading ? 'Analyzing precedents…' : 'Analyze scenario'}
              </span>
            </button>
          </form>

          {/* Example queries */}
          <div className="mt-20 pt-12 border-t border-[#181818]">
            <p
              className="text-[9px] text-[#2e2e2e] uppercase tracking-[0.28em] mb-8"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Example queries
            </p>
            <div>
              {EXAMPLE_QUERIES.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(q)}
                  className="block w-full text-left text-[13px] text-[#363636] hover:text-[#7a7a7a] transition-colors py-4 border-b border-[#141414] last:border-0 group"
                  style={{ fontFamily: 'var(--font-syne)' }}
                >
                  <span className="mr-3 text-[#252525] group-hover:text-[#4a4a4a] transition-colors text-xs">↗</span>
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Second image strip — open ocean ── */}
      <section
        className="relative overflow-hidden"
        style={{ height: 'clamp(260px, 38vh, 480px)' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1800&q=85&fit=crop"
          alt="Open ocean waves"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[#0c0c0c]/55" />
        <div className="absolute inset-0 flex items-center justify-center px-8">
          <p
            className="text-[#f0ede8]/8 font-medium tracking-[0.08em] text-center select-none"
            style={{
              fontFamily: 'var(--font-playfair)',
              fontSize: 'clamp(1.8rem, 5.5vw, 4.5rem)',
            }}
          >
            precedent · pressure · consequence
          </p>
        </div>
      </section>
    </div>
  )
}
