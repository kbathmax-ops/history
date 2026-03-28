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
        className="text-[9px] uppercase tracking-[0.24em]"
        style={{ fontFamily: 'var(--font-mono)', color: '#4a8a5a' }}
      >
        {msg}
      </p>
    )
  }

  return (
    <form onSubmit={submit} className="flex items-end gap-5">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="w-52 border-0 bg-transparent px-0 py-1.5 text-[11px] placeholder-[#1e2c3a] focus:outline-none transition-colors"
        style={{
          fontFamily: 'var(--font-mono)',
          color: 'var(--text)',
          borderBottom: '1px solid var(--border)',
        }}
        onFocus={e => { e.currentTarget.style.borderBottomColor = 'var(--accent-dim)' }}
        onBlur={e => { e.currentTarget.style.borderBottomColor = 'var(--border)' }}
      />
      <button
        type="submit"
        disabled={!email.trim() || status === 'loading'}
        className="pb-1.5 text-[9px] uppercase tracking-[0.24em] transition-opacity disabled:opacity-25 hover:opacity-100"
        style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}
      >
        {status === 'loading' ? '…' : 'Subscribe'}
      </button>
      {status === 'error' && (
        <p
          className="text-[9px] uppercase tracking-wider"
          style={{ fontFamily: 'var(--font-mono)', color: '#c07070' }}
        >
          {msg}
        </p>
      )}
    </form>
  )
}
