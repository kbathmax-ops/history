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
    <html lang="en" className={`${cormorant.variable} ${syne.variable} ${ibmMono.variable}`}>
      <body style={{ background: 'var(--bg)', color: 'var(--t1)' }}>

        <header
          className="sticky top-0 z-50 flex items-center justify-between px-8 py-[18px]"
          style={{
            background: 'rgba(6,9,15,0.92)',
            backdropFilter: 'blur(14px)',
            borderBottom: '1px solid var(--bd)',
          }}
        >
          <Link href="/" className="flex items-baseline gap-3 transition-opacity hover:opacity-60">
            <span
              className="font-medium text-[21px] tracking-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--t1)' }}
            >
              Sanctions Precedent
            </span>
            <span
              className="text-[9px] uppercase tracking-[0.26em]"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--t3)' }}
            >
              Intelligence
            </span>
          </Link>

          <nav
            className="flex items-center gap-1 rounded-full border px-4 py-[7px]"
            style={{ borderColor: 'var(--bd2)', background: 'var(--bg-panel)' }}
          >
            <Link
              href="/"
              className="px-3 text-[10px] uppercase tracking-[0.2em] transition-colors hover:opacity-100"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--t2)' }}
            >
              Analysis
            </Link>
            <span style={{ color: 'var(--bd2)' }}>·</span>
            <Link
              href="/admin"
              className="px-3 text-[10px] uppercase tracking-[0.2em] transition-colors hover:opacity-100"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--t3)' }}
            >
              Admin
            </Link>
          </nav>
        </header>

        <main>{children}</main>

        <footer
          className="px-8 py-10"
          style={{ borderTop: '1px solid var(--bd)' }}
        >
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
            <p
              className="text-[9px] uppercase tracking-[0.28em]"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--t3)' }}
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
