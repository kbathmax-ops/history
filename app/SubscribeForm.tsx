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
        style={{ fontFamily: 'var(--font-mono)', color: '#5a9e6a' }}
      >
        {msg}
      </p>
    )
  }

  return (
    <form onSubmit={submit} className="flex items-end gap-5">
      <div className="field" style={{ borderBottomColor: 'var(--bd2)' }}>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-48 border-0 bg-transparent px-0 py-1.5 text-[11px] focus:outline-none"
          style={{
            fontFamily: 'var(--font-mono)',
            color: 'var(--t1)',
            caretColor: 'var(--ac)',
          }}
        />
      </div>
      <button
        type="submit"
        disabled={!email.trim() || status === 'loading'}
        className="pb-1.5 text-[9px] uppercase tracking-[0.24em] transition-opacity disabled:opacity-25 hover:opacity-80"
        style={{ fontFamily: 'var(--font-mono)', color: 'var(--t2)' }}
      >
        {status === 'loading' ? '…' : 'Subscribe'}
      </button>
      {status === 'error' && (
        <p className="text-[9px]" style={{ fontFamily: 'var(--font-mono)', color: '#c08080' }}>
          {msg}
        </p>
      )}
    </form>
  )
}
