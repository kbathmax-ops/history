import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

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
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0a0a0a] text-[#e5e5e5] min-h-screen antialiased`}>
        <header className="border-b border-[#1f1f1f] px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <span className="text-[#e5e5e5] font-semibold tracking-tight text-lg">
                Sanctions Precedent
              </span>
              <span className="text-xs text-[#555] uppercase tracking-widest">
                Intelligence
              </span>
            </Link>
            <Link
              href="/admin"
              className="text-xs text-[#333] hover:text-[#666] transition-colors"
            >
              Admin
            </Link>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-6 py-10">{children}</main>
        <SubscribeStrip />
      </body>
    </html>
  )
}

function SubscribeStrip() {
  return (
    <footer className="border-t border-[#1a1a1a] px-6 py-8 mt-10">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-[#444]">
          Get updates when new precedents are added
        </p>
        <SubscribeForm />
      </div>
    </footer>
  )
}

// Client component for the subscribe form
import SubscribeForm from './SubscribeForm'
