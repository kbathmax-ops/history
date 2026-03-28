'use client'

import { useState } from 'react'

export default function SubscribeForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setStatus('error'); setMsg(data.error ?? 'Failed'); return }
      setStatus('ok')
      setMsg(data.message ?? 'Subscribed')
      setEmail('')
    } catch {
      setStatus('error')
      setMsg('Something went wrong')
    }
  }

  if (status === 'ok') {
    return (
      <p
        className="text-[10px] text-green-500/70 uppercase tracking-[0.2em]"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {msg}
      </p>
    )
  }

  return (
    <form onSubmit={submit} className="flex items-end gap-4">
      <div className="relative">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="bg-transparent border-0 border-b border-[#252525] focus:border-[#444] px-0 py-1.5 text-[#f0ede8] placeholder-[#2e2e2e] focus:outline-none text-[11px] w-52 transition-colors"
          style={{ fontFamily: 'var(--font-mono)' }}
        />
      </div>
      <button
        type="submit"
        disabled={!email.trim() || status === 'loading'}
        className="text-[10px] text-[#444] hover:text-[#888] transition-colors uppercase tracking-[0.2em] disabled:opacity-30 pb-1.5"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {status === 'loading' ? '…' : 'Subscribe'}
      </button>
      {status === 'error' && (
        <p
          className="text-[10px] text-red-400/70 uppercase tracking-wider"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {msg}
        </p>
      )}
    </form>
  )
}
