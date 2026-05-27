'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const STRATEGIES_SUB = [
  { href: '/strategies',                label: 'Toutes les stratégies' },
  { href: '/strategies#trend',          label: 'Suivi de tendance' },
  { href: '/strategies#breakout',       label: 'Cassure' },
  { href: '/strategies#mean-reversion', label: 'Retour à la moyenne' },
  { href: '/strategies#carry',          label: 'Portage' },
]

const ALL_LINKS = [
  { href: '/overview',      label: 'Vue d\'ensemble' },
  { href: '/strategies',    label: 'Stratégies' },
  { href: '/performance',   label: 'Performance' },
  { href: '/wealth',        label: 'Patrimoine' },
  { href: '/intelligence',  label: 'Intelligence' },
  { href: '/blog',          label: 'Blog' },
  { href: '/start',         label: 'Démarrer' },
]

export default function Nav() {
  const path = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const strategiesActive = path === '/strategies' || path.startsWith('/strategies/')
  const overviewActive   = path === '/overview'

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">

        {/* Logo */}
        <Link href="/" className="text-sm font-bold tracking-widest flex-shrink-0" onClick={() => setMobileOpen(false)}>
          ALGO<span className="text-positive">PROOF</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/overview"
            className={`text-xs font-semibold tracking-widest transition-colors ${overviewActive ? 'text-text' : 'text-muted hover:text-text'}`}>
            VUE D&apos;ENSEMBLE
          </Link>

          {/* STRATÉGIES dropdown */}
          <div className="relative group">
            <button className={`text-xs font-semibold tracking-widest transition-colors flex items-center gap-1 ${strategiesActive ? 'text-text' : 'text-muted hover:text-text'}`}>
              STRATÉGIES
              <svg className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100" viewBox="0 0 10 6" fill="currentColor">
                <path d="M0 0l5 6 5-6H0z"/>
              </svg>
            </button>
            <div className="absolute left-0 top-full mt-1 w-52 rounded border border-border bg-bg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
              {STRATEGIES_SUB.map(({ href, label }) => (
                <Link key={href} href={href}
                  className={`block px-4 py-2.5 text-xs transition-colors hover:text-positive ${path === href ? 'text-text font-semibold' : 'text-muted'}`}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {[
            { href: '/performance',  label: 'PERFORMANCE' },
            { href: '/wealth',       label: 'PATRIMOINE' },
            { href: '/intelligence', label: 'INTELLIGENCE' },
            { href: '/blog',         label: 'BLOG' },
          ].map(({ href, label }) => {
            const active = path === href || path.startsWith(href + '/')
            return (
              <Link key={href} href={href}
                className={`text-xs font-semibold tracking-widest transition-colors ${active ? 'text-text' : 'text-muted hover:text-text'}`}>
                {label}
              </Link>
            )
          })}

          {/* Démarrer CTA */}
          <Link
            href="/start"
            className={`text-xs font-semibold tracking-widest border rounded px-3 py-1 transition-colors ${
              path === '/start'
                ? 'border-positive text-positive'
                : 'border-border text-muted hover:border-positive hover:text-positive'
            }`}
          >
            DÉMARRER
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-muted hover:text-text transition-colors"
          onClick={() => setMobileOpen(o => !o)}
          aria-label="Menu"
        >
          {mobileOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-bg">
          {ALL_LINKS.map(({ href, label }) => {
            const active = path === href || path.startsWith(href + '/')
            return (
              <Link key={href} href={href}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-3 text-sm border-b border-border/50 transition-colors ${active ? 'text-text font-semibold' : 'text-muted hover:text-text'}`}>
                {label}
              </Link>
            )
          })}
        </div>
      )}
    </nav>
  )
}
