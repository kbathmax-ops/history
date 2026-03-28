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
  const [multilateral, setMultilateral] = useState<string>('') // '', 'true', 'false'
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

      // Store result in sessionStorage, navigate to results page
      sessionStorage.setItem('sanctions_result', JSON.stringify({ query, data }))
      router.push('/results')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-12">
        <h1 className="text-3xl font-semibold tracking-tight mb-3 text-[#f0f0f0]">
          Sanctions Precedent Analysis
        </h1>
        <p className="text-[#666] text-base leading-relaxed">
          Describe a sanctions scenario. The system retrieves the most similar
          historical episodes, computes scenario probabilities from their outcomes,
          and generates a structured analytical memo.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs text-[#666] uppercase tracking-wider mb-2">
            Scenario query
          </label>
          <textarea
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Describe the sanctions scenario — target country, initiators, objectives, instruments..."
            rows={4}
            className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-3 text-[#e5e5e5] placeholder-[#3a3a3a] focus:outline-none focus:border-[#444] resize-none text-sm"
            maxLength={1000}
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-[#444]">{query.length}/1000</span>
          </div>
        </div>

        {/* Filters row */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-[#666] uppercase tracking-wider mb-2">
              Coalition type
            </label>
            <select
              value={multilateral}
              onChange={e => setMultilateral(e.target.value)}
              className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2.5 text-[#e5e5e5] focus:outline-none focus:border-[#444] text-sm"
            >
              <option value="">Any</option>
              <option value="true">Multilateral</option>
              <option value="false">Unilateral</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#666] uppercase tracking-wider mb-2">
              Sector
            </label>
            <select
              value={sector}
              onChange={e => setSector(e.target.value)}
              className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2.5 text-[#e5e5e5] focus:outline-none focus:border-[#444] text-sm"
            >
              {SECTORS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#666] uppercase tracking-wider mb-2">
              Intensity
            </label>
            <select
              value={intensity}
              onChange={e => setIntensity(e.target.value)}
              className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2.5 text-[#e5e5e5] focus:outline-none focus:border-[#444] text-sm"
            >
              {INTENSITIES.map(i => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-sm border border-red-900/40 bg-red-950/20 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!query.trim() || loading}
          className="w-full bg-[#1a1a1a] border border-[#333] hover:border-[#555] text-[#e5e5e5] font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
        >
          {loading ? 'Analyzing...' : 'Analyze scenario'}
        </button>
      </form>

      {/* Example queries */}
      <div className="mt-12">
        <p className="text-xs text-[#555] uppercase tracking-wider mb-4">Example queries</p>
        <div className="space-y-2">
          {EXAMPLE_QUERIES.map((q, i) => (
            <button
              key={i}
              onClick={() => setQuery(q)}
              className="block w-full text-left text-sm text-[#555] hover:text-[#888] transition-colors py-1"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
