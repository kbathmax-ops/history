import type { Metadata } from 'next'
import { Playfair_Display, Syne, DM_Mono } from 'next/font/google'
import Link from 'next/link'
import './globals.css'
import SubscribeForm from './SubscribeForm'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Sanctions Precedent',
  description: 'Agentic sanctions intelligence — historical precedent analysis and scenario forecasting',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${syne.variable} ${dmMono.variable}`}>
      <body
        className="bg-[#0c0c0c] text-[#f0ede8] min-h-screen antialiased"
        style={{ fontFamily: 'var(--font-syne), sans-serif' }}
      >
        <header className="sticky top-0 z-50 px-8 py-5 flex items-center justify-between bg-[#0c0c0c]/90 backdrop-blur-md border-b border-[#181818]">
          <Link
            href="/"
            className="flex items-baseline gap-3 hover:opacity-75 transition-opacity"
          >
            <span
              className="text-[#f0ede8] font-medium text-xl tracking-tight"
              style={{ fontFamily: 'var(--font-playfair)' }}
            >
              Sanctions Precedent
            </span>
            <span
              className="text-[9px] text-[#4a4a4a] uppercase tracking-[0.22em]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Intelligence
            </span>
          </Link>

          <nav className="border border-[#282828] rounded-full px-5 py-2 flex items-center gap-6 bg-[#0e0e0e]">
            <Link
              href="/"
              className="text-[11px] text-[#666] hover:text-[#f0ede8] transition-colors tracking-widest uppercase"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Analysis
            </Link>
            <span className="text-[#282828]">·</span>
            <Link
              href="/admin"
              className="text-[11px] text-[#666] hover:text-[#f0ede8] transition-colors tracking-widest uppercase"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Admin
            </Link>
          </nav>
        </header>

        <main>{children}</main>

        <SubscribeStrip />
      </body>
    </html>
  )
}

function SubscribeStrip() {
  return (
    <footer className="border-t border-[#181818] px-8 py-10">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <p
          className="text-[10px] text-[#383838] uppercase tracking-[0.22em]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          Receive updates when new precedents are indexed
        </p>
        <SubscribeForm />
      </div>
    </footer>
  )
}
