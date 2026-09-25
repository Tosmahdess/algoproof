'use client'

import { linkClass } from '@/lib/link-roles'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import TrackedLink from '@/components/TrackedLink'
import LinkPending from '@/components/LinkPending'
import { trackCtaLab } from '@/lib/analytics'

// Lot 2 of the design audit (2026-09-25, conception §2.2 and §2.3, user decision
// of the same day): five flat links, one button, no dropdown, no shouted label.
//
// Before: « MES BOTS ▾ » (a hover menu over the two pages the site exists for),
// « INVESTIR » (the one word of the bar that promised advice), « MÉTÉO DU MARCHÉ »,
// « APPRENDRE » (which led to a page titled « Articles »), a green « LE LABO »
// pill (green means gain everywhere else) and « COMPTE ». The words below are
// the words of the page titles they open. The lab's TopNav.tsx carries the same
// five, in the same order (twin, one visual language on two domains).
const LINKS = [
  { href: '/overview',     label: 'La flotte' },
  { href: '/strategies',   label: 'Stratégies' },
  { href: '/investir',     label: 'Sociétés' },
  { href: '/intelligence', label: 'Météo' },
  { href: '/blog',         label: 'Articles' },
]

// The account lives on the lab (magic link + subscription state): algoproof.fr
// has no auth of its own. The button opens the app, not the landing (D053, D060).
const LAB_URL = 'https://lab.algoproof.fr'
const ACCOUNT_URL = `${LAB_URL}/account`
const LAB_APP_URL = `${LAB_URL}/lab`

export default function Nav() {
  const path = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  // The drawer closes when the navigation COMMITS, not when the link is clicked:
  // closing on the click unmounted the link, and the LinkPending inside it,
  // before `pending` could ever be true. Internal entries close on the pathname
  // change; an external entry leaves the site, no pathname change is coming,
  // it closes itself.
  useEffect(() => { setMobileOpen(false) }, [path])

  const isActive = (href: string) => path === href || path.startsWith(href + '/')

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-bg/95 backdrop-blur">
      <div data-testid="nav-bar" className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">

        {/* Wordmark: the one place the brand green lives (C5). */}
        <Link href="/" className="text-sm font-semibold tracking-widest flex-shrink-0" onClick={() => setMobileOpen(false)}>
          ALGO<span className="text-brand">PROOF</span>
        </Link>

        {/* Desktop: the five links, then the account. */}
        <div data-testid="nav-desktop" className="hidden md:flex items-center gap-6">
          {LINKS.map(({ href, label }) => {
            const active = isActive(href)
            return (
              <Link key={href} href={href}
                aria-current={active ? 'page' : undefined}
                className={linkClass('nav', `inline-flex items-center gap-1.5 text-sm font-medium${active ? ' underline decoration-2 underline-offset-8' : ''}`, { active })}>
                {label}
                <LinkPending />
              </Link>
            )
          })}
          <a href={ACCOUNT_URL} className={linkClass('nav', 'text-sm')} title="Ton compte est sur lab.algoproof.fr">
            Compte ↗
          </a>
        </div>

        {/* The one button of the bar, on every width: short word on a phone. */}
        <div className="flex items-center gap-2">
          <TrackedLink
            href={LAB_APP_URL}
            event="cta_lab"
            location="nav"
            className="inline-flex h-9 items-center rounded-md bg-foreground px-3.5 text-sm font-semibold text-bg hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            <span className="hidden sm:inline">Tester une stratégie</span>
            <span className="sm:hidden">Tester</span>
          </TrackedLink>

          <button
            type="button"
            className="md:hidden p-2 text-muted hover:text-foreground transition-colors"
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Phone drawer: the same five links, flat, 48 px each; the lab and the
          account at the foot. No groups: five links do not fold. */}
      {mobileOpen && (
        <div data-testid="mobile-menu" className="md:hidden border-t border-border bg-bg max-h-[80vh] overflow-y-auto">
          <div className="px-4 py-2">
            {LINKS.map(({ href, label }) => {
              const active = isActive(href)
              return (
                <Link key={href} href={href}
                  aria-current={active ? 'page' : undefined}
                  className={linkClass('nav', `flex h-12 items-center justify-between gap-2 border-b border-border text-base font-medium${active ? ' pl-3 shadow-[inset_2px_0_0_var(--foreground)]' : ''}`, { active })}>
                  <span>{label}</span>
                  <LinkPending />
                </Link>
              )
            })}
          </div>
          <div className="flex flex-col gap-1 px-4 pb-4 pt-3 text-sm">
            <a href={LAB_APP_URL} target="_blank" rel="noopener noreferrer"
               className={linkClass('nav', 'flex h-10 items-center')}
               onClick={() => { trackCtaLab('nav-mobile'); setMobileOpen(false) }}>
              Ouvrir le labo ↗
            </a>
            <a href={ACCOUNT_URL} target="_blank" rel="noopener noreferrer"
               className={linkClass('nav', 'flex h-10 items-center')}
               onClick={() => setMobileOpen(false)}>
              Compte ↗
            </a>
          </div>
        </div>
      )}
    </nav>
  )
}
