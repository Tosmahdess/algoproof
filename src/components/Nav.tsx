import Link from 'next/link'
import { DISCORD_URL } from '@/lib/constants'

const links = [
  { href: '/strategies', label: 'Strategies' },
  { href: '/dashboard',  label: 'Dashboard' },
  { href: '/blog',       label: 'Blog' },
]

export default function Nav() {
  return (
    <nav className="border-b border-border bg-bg sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg tracking-tight">
          Algo<span className="text-positive">Proof</span>
        </Link>
        <div className="flex items-center gap-6">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-muted hover:text-white transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm px-3 py-1.5 rounded-md bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
          >
            Discord
          </a>
        </div>
      </div>
    </nav>
  )
}
