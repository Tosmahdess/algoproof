'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/strategies',   label: 'TRADE' },
  { href: '/wealth',       label: 'GROW' },
  { href: '/intelligence', label: 'INTELLIGENCE' },
  { href: '/blog',         label: 'BLOG' },
]

export default function Nav() {
  const path = usePathname()

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-bg">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg tracking-tight">
          ALGO<span className="text-positive">PROOF</span>
        </Link>

        <div className="flex items-center gap-6">
          {LINKS.map(({ href, label }) => {
            const active = path === href || path.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`text-sm transition-colors ${
                  active ? 'text-white font-semibold' : 'text-muted hover:text-white'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
