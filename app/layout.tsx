import type { Metadata } from 'next'
import { Cormorant_Garamond, Syne, IBM_Plex_Mono } from 'next/font/google'
import Link from 'next/link'
import './globals.css'
import SubscribeForm from './SubscribeForm'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
})

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const ibmMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Sanctions Precedent',
  description: 'Agentic sanctions intelligence — historical precedent analysis and scenario forecasting',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${syne.variable} ${ibmMono.variable}`}
    >
      <body
        className="min-h-screen antialiased"
        style={{
          background: 'var(--bg)',
          color: 'var(--text)',
          fontFamily: 'var(--font-sans), sans-serif',
        }}
      >
        {/* Header */}
        <header
          className="sticky top-0 z-50 flex items-center justify-between px-8 py-[18px]"
          style={{
            background: 'var(--bg)/95',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <Link
            href="/"
            className="flex items-baseline gap-3 transition-opacity hover:opacity-60"
          >
            <span
              className="font-medium text-[22px] tracking-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
            >
              Sanctions Precedent
            </span>
            <span
              className="text-[9px] uppercase tracking-[0.28em]"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}
            >
              Intelligence
            </span>
          </Link>

          <nav
            className="flex items-center gap-1 rounded-full border px-4 py-[7px]"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}
          >
            <Link
              href="/"
              className="px-3 text-[10px] uppercase tracking-[0.2em] transition-colors hover:opacity-100"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}
            >
              Analysis
            </Link>
            <span style={{ color: 'var(--text-muted)' }}>·</span>
            <Link
              href="/admin"
              className="px-3 text-[10px] uppercase tracking-[0.2em] transition-colors hover:opacity-100"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}
            >
              Admin
            </Link>
          </nav>
        </header>

        <main>{children}</main>

        {/* Footer */}
        <footer
          className="px-8 py-10"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
            <p
              className="text-[9px] uppercase tracking-[0.28em]"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}
            >
              Receive updates when new precedents are indexed
            </p>
            <SubscribeForm />
          </div>
        </footer>
      </body>
    </html>
  )
}
