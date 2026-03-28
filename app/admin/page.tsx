'use client'

import { useState } from 'react'

interface PendingCase {
  id: string
  query: string
  created_at: string
  episode_data: Record<string, unknown>
}

export default function AdminPage() {
  const [secret, setSecret] = useState('')
  const [authed, setAuthed] = useState(false)
  const [cases, setCases] = useState<PendingCase[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionState, setActionState] = useState<Record<string, 'loading' | 'done' | 'error'>>({})

  async function fetchPending(s: string) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin', { headers: { 'x-admin-secret': s } })
      if (res.status === 401) { setError('Wrong secret'); return }
      if (!res.ok) { setError('Server error'); return }
      const data = await res.json()
      setCases(data.pending ?? [])
      setAuthed(true)
    } catch {
      setError('Failed to connect')
    } finally {
      setLoading(false)
    }
  }

  async function act(id: string, action: 'approve' | 'reject') {
    setActionState(s => ({ ...s, [id]: 'loading' }))
    try {
      const res = await fetch('/api/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify({ id, action }),
      })
      if (!res.ok) { setActionState(s => ({ ...s, [id]: 'error' })); return }
      setActionState(s => ({ ...s, [id]: 'done' }))
      setCases(prev => prev.filter(c => c.id !== id))
    } catch {
      setActionState(s => ({ ...s, [id]: 'error' }))
    }
  }

  if (!authed) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <h1 className="text-xl font-semibold text-[#e5e5e5] mb-6">Admin</h1>
        <form
          onSubmit={e => { e.preventDefault(); fetchPending(secret) }}
          className="space-y-4"
        >
          <input
            type="password"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            placeholder="Admin secret"
            className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-3 text-[#e5e5e5] placeholder-[#3a3a3a] focus:outline-none focus:border-[#444] text-sm"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={!secret || loading}
            className="w-full bg-[#1a1a1a] border border-[#333] hover:border-[#555] text-[#e5e5e5] font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-40 text-sm"
          >
            {loading ? 'Checking…' : 'Enter'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold text-[#e5e5e5]">Pending Cases</h1>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[#555]">{cases.length} pending</span>
          <button
            onClick={() => fetchPending(secret)}
            className="text-xs text-[#555] hover:text-[#888] border border-[#222] hover:border-[#333] rounded px-3 py-1.5 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {cases.length === 0 && (
        <p className="text-[#555] text-sm">No pending cases.</p>
      )}

      <div className="space-y-4">
        {cases.map(c => {
          const ep = c.episode_data
          const state = actionState[c.id]
          return (
            <div key={c.id} className="border border-[#1f1f1f] rounded-lg p-5 bg-[#0d0d0d]">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <span className="text-xs font-mono text-[#555] bg-[#151515] px-2 py-0.5 rounded">
                    {String(ep.episode_id ?? '—')}
                  </span>
                  <h3 className="text-sm font-medium text-[#ddd] mt-2">
                    {String(ep.name ?? '—')}
                  </h3>
                </div>
                <span className="text-xs text-[#444] shrink-0">
                  {new Date(c.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-[#666] mb-3">
                <span>Target: <span className="text-[#888]">{String(ep.target ?? '—')}</span></span>
                <span>Sector: <span className="text-[#888]">{String(ep.sector ?? '—')}</span></span>
                <span>Initiators: <span className="text-[#888]">{Array.isArray(ep.initiators) ? (ep.initiators as string[]).join(', ') : '—'}</span></span>
                <span>Intensity: <span className="text-[#888] capitalize">{String(ep.enforcement_intensity ?? '—')}</span></span>
                <span>Multilateral: <span className="text-[#888]">{ep.multilateral ? 'Yes' : 'No'}</span></span>
                <span>Outcome: <span className="text-[#888]">{String(ep.objective_achieved ?? '—')}</span></span>
              </div>

              <p className="text-xs text-[#444] mb-4">
                Query: <span className="text-[#666]">{c.query}</span>
              </p>

              {state === 'done' ? (
                <p className="text-xs text-green-500">Done</p>
              ) : state === 'error' ? (
                <p className="text-xs text-red-400">Action failed — try again</p>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => act(c.id, 'approve')}
                    disabled={state === 'loading'}
                    className="text-xs text-green-400 border border-green-900/50 hover:border-green-700 rounded px-4 py-1.5 transition-colors disabled:opacity-40"
                  >
                    {state === 'loading' ? 'Working…' : 'Approve'}
                  </button>
                  <button
                    onClick={() => act(c.id, 'reject')}
                    disabled={state === 'loading'}
                    className="text-xs text-red-400 border border-red-900/50 hover:border-red-700 rounded px-4 py-1.5 transition-colors disabled:opacity-40"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Generate new case */}
      <GenerateForm secret={secret} onGenerated={() => fetchPending(secret)} />
    </div>
  )
}

function GenerateForm({ secret, onGenerated }: { secret: string; onGenerated: () => void }) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function generate(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setMsg('')
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify({ query: query.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setMsg(`Error: ${data.error}`); return }
      setMsg(`Generated: ${data.name} (${data.episode_id})`)
      setQuery('')
      onGenerated()
    } catch {
      setMsg('Failed to generate')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-12 border-t border-[#1a1a1a] pt-8">
      <h2 className="text-xs text-[#555] uppercase tracking-wider mb-4">Generate New Episode</h2>
      <form onSubmit={generate} className="flex gap-3">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="e.g. Syria civil war sanctions 2011"
          className="flex-1 bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-[#e5e5e5] placeholder-[#3a3a3a] focus:outline-none focus:border-[#444] text-sm"
          maxLength={500}
        />
        <button
          type="submit"
          disabled={!query.trim() || loading}
          className="bg-[#1a1a1a] border border-[#333] hover:border-[#555] text-[#e5e5e5] font-medium py-2.5 px-5 rounded-lg transition-colors disabled:opacity-40 text-sm shrink-0"
        >
          {loading ? 'Generating…' : 'Generate'}
        </button>
      </form>
      {msg && <p className="text-xs text-[#666] mt-2">{msg}</p>}
    </div>
  )
}
