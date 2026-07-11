'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

// "Mes bots" hub — dropdown over the live-proof sub-pages
const MES_BOTS_SUB = [
  { href: '/overview',    label: 'Vue d\'ensemble' },
  { href: '/strategies',  label: 'Les stratégies' },
  { href: '/performance', label: 'Performance' },
  { href: '/journal',     label: 'Ce qui a changé' },
]
const MES_BOTS_PATHS = MES_BOTS_SUB.map(x => x.href)

// The 3 plain hubs after "Mes bots"
const HUBS = [
  { href: '/wealth',       label: 'INVESTIR' },
  { href: '/intelligence', label: 'LE MARCHÉ' },
  { href: '/blog',         label: 'APPRENDRE' },
]

// Le labo — shared by the desktop dropdown and the mobile group
const LABO_LINKS = [
  { href: 'https://lab.algoproof.fr', label: 'Ouvrir le labo' },
  { href: 'https://lab.algoproof.fr/apprendre', label: 'Tutoriels' },
  { href: 'https://lab.algoproof.fr/bibliotheque', label: 'Bibliothèque des stratégies' },
  { href: 'https://lab.algoproof.fr/agents', label: 'Agents IA (MCP)' },
  { href: 'https://lab.algoproof.fr/#vote', label: 'Le vote du labo' },
  { href: 'https://lab.algoproof.fr/membre', label: 'Membres (bientôt)' },
]

// Mobile menu, grouped to mirror the desktop hierarchy
const MOBILE_GROUPS: { title: string; links: { href: string; label: string; external?: boolean }[] }[] = [
  { title: 'Mes bots', links: MES_BOTS_SUB },
  { title: 'Explorer', links: [
    { href: '/wealth',       label: 'Investir' },
    { href: '/intelligence', label: 'Le marché' },
    { href: '/blog',         label: 'Apprendre' },
  ]},
  { title: 'Le labo', links: [
    { href: '/labo', label: 'Découvrir le labo' },
    ...LABO_LINKS.map(l => ({ ...l, external: true })),
  ]},
]

export default function Nav() {
  const path = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const mesBotsActive = MES_BOTS_PATHS.some(p => path === p || path.startsWith(p + '/'))

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">

        {/* Logo */}
        <Link href="/" className="text-sm font-bold tracking-widest flex-shrink-0" onClick={() => setMobileOpen(false)}>
          ALGO<span className="text-positive">PROOF</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">

          {/* MES BOTS dropdown */}
          <div className="relative group">
            <button type="button" className={`text-xs font-semibold tracking-widest transition-colors flex items-center gap-1 ${mesBotsActive ? 'text-text' : 'text-muted hover:text-text'}`}>
              MES BOTS
              <svg className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100" viewBox="0 0 10 6" fill="currentColor">
                <path d="M0 0l5 6 5-6H0z"/>
              </svg>
            </button>
            <div className="absolute left-0 top-full mt-1 w-52 rounded border border-border bg-bg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
              {MES_BOTS_SUB.map(({ href, label }) => (
                <Link key={href} href={href}
                  className={`block px-4 py-2.5 text-xs transition-colors hover:text-positive ${path === href ? 'text-text font-semibold' : 'text-muted'}`}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* 3 plain hubs */}
          {HUBS.map(({ href, label }) => {
            const active = path === href || path.startsWith(href + '/')
            return (
              <Link key={href} href={href}
                className={`text-xs font-semibold tracking-widest transition-colors ${active ? 'text-text' : 'text-muted hover:text-text'}`}>
                {label}
              </Link>
            )
          })}

          {/* Le labo : CTA + dropdown miroir de MES BOTS */}
          <div className="relative group">
            <Link
              href="/labo"
              className="text-xs font-semibold tracking-widest border rounded px-3 py-1 transition-colors border-positive text-positive hover:bg-positive hover:text-black inline-flex items-center gap-1.5"
            >
              LE LABO
              <svg className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" viewBox="0 0 10 6" fill="currentColor">
                <path d="M0 0l5 6 5-6H0z"/>
              </svg>
            </Link>
            <div className="absolute right-0 top-full mt-1 w-56 rounded border border-border bg-bg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
              {LABO_LINKS.map(({ href, label }) => (
                <a key={href} href={href} target="_blank" rel="noopener noreferrer"
                  className="block px-4 py-2.5 text-xs text-muted transition-colors hover:text-positive">
                  {label} ↗
                </a>
              ))}
            </div>
          </div>
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

      {/* Mobile menu — real collapsible accordions (native details/summary).
          The group containing the current page starts open. */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-bg max-h-[80vh] overflow-y-auto">
          {MOBILE_GROUPS.map(group => {
            const containsActive = group.links.some(l => !l.external && (path === l.href || path.startsWith(l.href + '/')))
            return (
              <details key={group.title} open={containsActive} className="group border-b border-border/40">
                <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none text-[11px] font-semibold tracking-[0.2em] uppercase text-positive select-none [&::-webkit-details-marker]:hidden">
                  {group.title}
                  <svg className="w-2.5 h-2.5 opacity-60 transition-transform group-open:rotate-180" viewBox="0 0 10 6" fill="currentColor"><path d="M0 0l5 6 5-6H0z"/></svg>
                </summary>
                {group.links.map(({ href, label, external }) => {
                  const active = !external && (path === href || path.startsWith(href + '/'))
                  return (
                    <Link key={href} href={href}
                      target={external ? '_blank' : undefined}
                      rel={external ? 'noopener noreferrer' : undefined}
                      onClick={() => setMobileOpen(false)}
                      className={`block pl-7 pr-4 py-2.5 text-sm border-t border-border/30 transition-colors ${active ? 'text-text font-semibold' : 'text-muted hover:text-text'}`}>
                      {label}{external ? ' ↗' : ''}
                    </Link>
                  )
                })}
              </details>
            )
          })}
        </div>
      )}
    </nav>
  )
}
