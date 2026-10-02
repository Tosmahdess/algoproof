'use client'

import { linkClass } from '@/lib/link-roles'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import TrackedLink from '@/components/TrackedLink'
import LinkPending from '@/components/LinkPending'
import { trackCtaLab } from '@/lib/analytics'
import { labUrl } from '@/lib/lab-links'

// Lot 2 of the design audit (2026-09-25, conception §2.2 and §2.3, user decision
// of the same day): five flat links, one button, no dropdown, no shouted label.
//
// Before: « MES BOTS ▾ » (a hover menu over the two pages the site exists for),
// « INVESTIR » (the one word of the bar that promised advice), « MÉTÉO DU MARCHÉ »,
// « APPRENDRE » (which led to a page titled « Articles »), a green « LE LABO »
// pill (green means gain everywhere else) and « COMPTE ». The words below are
// the words of the page titles they open. The lab's TopNav.tsx carries the same
// five, in the same order (twin, one visual language on two domains).
// « Stratégies » opens the library (user, 2026-10-01, after D084): every engine
// variant, one card per idea. The concept fiches and the method stay at /strategies,
// in the same section of the bar (`also`), reached from the library and the footer.
// A bot page lives under /strategies/bot/ but belongs to the fleet: its breadcrumb reads
// « La flotte » (refonte finition, 2026-10-02), so the bar lights « La flotte » there and
// `except` keeps « Stratégies » dark.
const LINKS: { href: string; label: string; also?: string[]; except?: string[] }[] = [
  { href: '/overview',     label: 'La flotte', also: ['/strategies/bot'] },
  { href: '/bibliotheque', label: 'Stratégies', also: ['/strategies'], except: ['/strategies/bot'] },
  { href: '/investir',     label: 'Sociétés' },
  { href: '/intelligence', label: 'Météo' },
  { href: '/blog',         label: 'Articles' },
]

// The account lives on the lab (magic link + subscription state): algoproof.fr
// has no auth of its own. The button opens the app, not the landing (D053, D060).
const LAB_URL = 'https://lab.algoproof.fr'
const ACCOUNT_URL = `${LAB_URL}/account`
// Mon espace (espace-direct lot A, D075): the favorites starred on bot pages.
// It lives on the lab with the account, so it leaves the site the same way.
const ESPACE_URL = `${LAB_URL}/espace`
const LAB_APP_URL = `${LAB_URL}/lab`

// Refonte « Le registre des décisions », lot 1 (2026-10-02): the bar of Astra's
// mock-up. The wordmark « AlgoProof », Proof in the brand green; the same five
// links; « Le labo » stays the one button (owner, 2026-09-26) though the mock-up
// has none, in the mock-up's primary style: slate fill, ink text, link-blue edge.
// The phone menu button is 44 px and Escape closes the drawer.
const BUTTON = 'inline-flex min-h-11 items-center justify-center rounded border px-3.5 text-sm font-semibold text-foreground transition-colors whitespace-nowrap'

export default function Nav() {
  const path = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)

  // The drawer closes when the navigation COMMITS, not when the link is clicked:
  // closing on the click unmounted the link, and the LinkPending inside it,
  // before `pending` could ever be true. Internal entries close on the pathname
  // change; an external entry leaves the site, no pathname change is coming,
  // it closes itself.
  useEffect(() => { setMobileOpen(false) }, [path])

  // Escape closes the drawer and gives the focus back to the button that opened it.
  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setMobileOpen(false)
      menuButton.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  const under = (href: string) => path === href || path.startsWith(href + '/')
  const isActive = (href: string) => {
    const link = LINKS.find(l => l.href === href)
    if ((link?.except ?? []).some(under)) return false
    return under(href) || (link?.also ?? []).some(under)
  }

  return (
    <nav aria-label="Navigation principale" className="sticky top-0 z-50 border-b border-border bg-bg">
      <div data-testid="nav-bar" className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">

        {/* Wordmark: the one place the brand green lives (C5). */}
        <Link href="/" aria-label="AlgoProof, accueil"
          className="flex-shrink-0 rounded-sm text-xl font-bold tracking-[0.05em] text-foreground"
          onClick={() => setMobileOpen(false)}>
          Algo<span className="text-brand">Proof</span>
        </Link>

        {/* Desktop: the five links, then the space and the account. */}
        <div data-testid="nav-desktop" className="hidden md:flex flex-1 items-center gap-6">
          {LINKS.map(({ href, label }) => {
            const active = isActive(href)
            return (
              <Link key={href} href={href}
                aria-current={active ? 'page' : undefined}
                className={linkClass('nav', `inline-flex min-h-11 items-center gap-1.5 text-sm${active ? ' underline decoration-2 underline-offset-8' : ''}`, { active })}>
                {label}
                <LinkPending />
              </Link>
            )
          })}
          <a href={labUrl(ESPACE_URL, 'nav')} className={linkClass('nav', 'ml-auto inline-flex min-h-11 items-center text-sm')} title="Tes bots favoris, sur lab.algoproof.fr">
            Mon espace ↗
          </a>
          <a href={labUrl(ACCOUNT_URL, 'nav')} className={linkClass('nav', 'inline-flex min-h-11 items-center text-sm')} title="Ton compte est sur lab.algoproof.fr">
            Compte ↗
          </a>
        </div>

        {/* The one button of the bar, the same words on every width. « Tester une
            stratégie » / « Tester » read as a verb with no object on a phone; the owner
            chose the place's own name (2026-09-26, closed vocabulary: le labo). */}
        <div className="flex items-center gap-2">
          <TrackedLink
            href={labUrl(LAB_APP_URL, 'nav')}
            event="cta_lab"
            location="nav"
            className={`${BUTTON} border-accent bg-button hover:bg-card-2`}
          >
            Le labo
          </TrackedLink>

          <button
            ref={menuButton}
            type="button"
            className={`${BUTTON} md:hidden min-w-11 border-border-strong hover:bg-card-2`}
            onClick={() => setMobileOpen(o => !o)}
            aria-controls="menu-mobile"
            aria-expanded={mobileOpen}
          >
            Menu
          </button>
        </div>
      </div>

      {/* Phone drawer: the same five links, flat, 48 px each; the lab and the
          account at the foot. No groups: five links do not fold. */}
      {mobileOpen && (
        <div id="menu-mobile" data-testid="mobile-menu" className="md:hidden border-t border-border bg-bg max-h-[80vh] overflow-y-auto">
          <div className="px-4 py-2">
            {LINKS.map(({ href, label }) => {
              const active = isActive(href)
              return (
                <Link key={href} href={href}
                  aria-current={active ? 'page' : undefined}
                  className={linkClass('nav', `flex h-12 items-center justify-between gap-2 border-b border-border text-base${active ? ' underline decoration-2 underline-offset-8' : ''}`, { active })}>
                  <span>{label}</span>
                  <LinkPending />
                </Link>
              )
            })}
          </div>
          <div className="flex flex-col gap-1 px-4 pb-4 pt-3 text-sm">
            <a href={labUrl(LAB_APP_URL, 'nav')} target="_blank" rel="noopener noreferrer"
               className={linkClass('nav', 'flex min-h-11 items-center')}
               onClick={() => { trackCtaLab('nav-mobile'); setMobileOpen(false) }}>
              Ouvrir le labo ↗
            </a>
            <a href={labUrl(ESPACE_URL, 'nav')} target="_blank" rel="noopener noreferrer"
               className={linkClass('nav', 'flex min-h-11 items-center')}
               onClick={() => setMobileOpen(false)}>
              Mon espace ↗
            </a>
            <a href={labUrl(ACCOUNT_URL, 'nav')} target="_blank" rel="noopener noreferrer"
               className={linkClass('nav', 'flex min-h-11 items-center')}
               onClick={() => setMobileOpen(false)}>
              Compte ↗
            </a>
          </div>
        </div>
      )}
    </nav>
  )
}
