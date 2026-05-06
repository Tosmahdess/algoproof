'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const STRATEGIES_SUB = [
  { href: '/strategies',              label: 'Toutes les stratégies' },
  { href: '/strategies#trend',        label: 'Suivi de tendance' },
  { href: '/strategies#breakout',     label: 'Cassure de niveaux' },
  { href: '/strategies#multi-signal', label: 'Multi-signaux' },
  { href: '/strategies#multi-asset',  label: 'Multi-actifs' },
  { href: '/strategies#leveraged',    label: 'Avec levier' },
  { href: '/dashboard',               label: 'Tableau comparatif' },
]

export default function Nav() {
  const path = usePathname()

  const strategiesActive = path === '/strategies' || path.startsWith('/strategies/') || path === '/dashboard'
  const overviewActive   = path === '/overview'

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-sm font-bold tracking-widest text-text">
          ALGO<span className="text-positive">PROOF</span>
        </Link>

        <div className="flex items-center gap-6">

          {/* VUE D'ENSEMBLE — top level */}
          <Link
            href="/overview"
            className={`text-xs font-semibold tracking-widest transition-colors ${
              overviewActive ? 'text-text' : 'text-muted hover:text-text'
            }`}
          >
            VUE D&apos;ENSEMBLE
          </Link>

          {/* STRATÉGIES avec sous-menu */}
          <div className="relative group">
            <button
              className={`text-xs font-semibold tracking-widest transition-colors flex items-center gap-1 ${
                strategiesActive ? 'text-text' : 'text-muted hover:text-text'
              }`}
            >
              STRATÉGIES
              <svg className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100 transition-opacity" viewBox="0 0 10 6" fill="currentColor">
                <path d="M0 0l5 6 5-6H0z"/>
              </svg>
            </button>

            <div className="absolute left-0 top-full mt-1 w-52 rounded border border-border bg-bg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
              {STRATEGIES_SUB.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`block px-4 py-2.5 text-xs transition-colors hover:text-positive ${
                    path === href ? 'text-text font-semibold' : 'text-muted'
                  } ${href === '/dashboard' ? 'border-t border-border mt-1' : ''}`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Autres liens */}
          {[
            { href: '/wealth',       label: 'PATRIMOINE' },
            { href: '/intelligence', label: 'INTELLIGENCE' },
            { href: '/blog',         label: 'BLOG' },
          ].map(({ href, label }) => {
            const active = path === href || path.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`text-xs font-semibold tracking-widest transition-colors ${
                  active ? 'text-text' : 'text-muted hover:text-text'
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
