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
    return <p className="text-xs text-green-500">{msg}</p>
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="bg-[#111] border border-[#222] rounded px-3 py-1.5 text-[#e5e5e5] placeholder-[#3a3a3a] focus:outline-none focus:border-[#444] text-xs w-52"
      />
      <button
        type="submit"
        disabled={!email.trim() || status === 'loading'}
        className="text-xs text-[#666] hover:text-[#999] border border-[#222] hover:border-[#333] rounded px-3 py-1.5 transition-colors disabled:opacity-40"
      >
        {status === 'loading' ? '…' : 'Subscribe'}
      </button>
      {status === 'error' && <p className="text-xs text-red-400 self-center">{msg}</p>}
    </form>
  )
}
