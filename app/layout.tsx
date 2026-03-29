import type { Metadata } from 'next'
import { Bricolage_Grotesque, IBM_Plex_Mono } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['200', '300', '400', '500', '600', '700', '800'],
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
    <html lang="en" className={`${bricolage.variable} ${ibmMono.variable}`}>
      <body style={{ background: 'var(--bg)', color: 'var(--t1)' }}>

        <header
          className="sticky top-0 z-50 flex items-center justify-between px-8 py-4"
          style={{
            background: 'rgba(6,11,18,0.92)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid var(--bd)',
          }}
        >
          <Link href="/" className="flex items-baseline gap-3 transition-opacity hover:opacity-60">
            <span
              className="font-semibold text-[19px] tracking-tight"
              style={{ color: 'var(--t1)' }}
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
            className="flex items-center rounded-full border px-4 py-[7px]"
            style={{ borderColor: 'var(--bd2)', background: 'var(--bg2)' }}
          >
            <Link
              href="/"
              className="px-3 text-[10px] uppercase tracking-[0.2em] transition-colors"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--t2)' }}
            >
              Analysis
            </Link>
          </nav>
        </header>

        <main>{children}</main>

        <footer className="px-8 py-6" style={{ borderTop: '1px solid var(--bd2)' }}>
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <p
              className="text-[11px] font-medium tracking-tight"
              style={{ color: 'var(--t2)' }}
            >
              Sanctions Precedent
              <span
                className="ml-3 text-[10px] font-normal"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--t3)' }}
              >
                © {new Date().getFullYear()} All rights reserved.
              </span>
            </p>
            <div className="flex items-center gap-6">
              <Link
                href="/terms"
                className="text-[10px] uppercase tracking-[0.22em] transition-opacity hover:opacity-60"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--t2)' }}
              >
                Terms of Use
              </Link>
            </div>
          </div>
        </footer>

      </body>
    </html>
  )
}
