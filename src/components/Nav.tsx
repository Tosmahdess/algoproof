'use client'

import { linkClass } from '@/lib/link-roles'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import TrackedLink from '@/components/TrackedLink'
import LinkPending from '@/components/LinkPending'
import { trackCtaLab } from '@/lib/analytics'

// "Mes bots" hub — dropdown over the live-proof sub-pages
const MES_BOTS_SUB = [
  { href: '/overview',    label: 'La flotte' },
  { href: '/strategies',  label: 'Les stratégies' },
]
const MES_BOTS_PATHS = MES_BOTS_SUB.map(x => x.href)

// The 3 plain hubs after "Mes bots"
// 2026-09-09 : /wealth est supprimee. Ses analyses vivaient a cote d'/investir,
// dont 55 en doublon exact ; les 27 que la regle ne peut pas noter y ont ete
// reprises. Une seule page societes, comme l'user le demandait depuis le debut.
//
// 2026-09-07, decision user : INVESTIR mene a /investir. L'entree portait deja
// ce nom et pointait vers /wealth ; depuis qu'une page s'appelle reellement
// /investir, un libelle qui mene ailleurs que la page du meme nom est un piege.
// /wealth reste en ligne, en second, atteignable depuis /investir et le pied de
// page : ses analyses restent du travail reel, et l'allocation long terme n'a
// pas d'autre domicile.
const HUBS = [
  { href: '/investir',     label: 'INVESTIR' },
  { href: '/intelligence', label: 'MÉTÉO DU MARCHÉ' },
  { href: '/blog',         label: 'APPRENDRE' },
]

// Le labo : un seul lien vers le cockpit du lab (dropdown retiré le 2026-08-21,
// décision user). Le compte vit sur le lab (magic link + état d'abonnement) :
// algoproof.fr n'a pas d'auth propre, donc COMPTE pointe là-bas.
const LAB_URL = 'https://lab.algoproof.fr'
const ACCOUNT_URL = `${LAB_URL}/account`
// LE LABO opens the app, not the landing at the lab root: the pitch on every
// visit cost one extra click each time (D053). The landing stays the external
// entry page.
const LAB_APP_URL = `${LAB_URL}/lab`

// Mobile menu, grouped to mirror the desktop hierarchy
const MOBILE_GROUPS: { title: string; links: { href: string; label: string; external?: boolean; ctaLab?: string }[] }[] = [
  { title: 'Mes bots', links: MES_BOTS_SUB },
  { title: 'Explorer', links: [
    { href: '/investir',     label: 'Investir' },
    { href: '/intelligence', label: 'Météo du marché' },
    { href: '/blog',         label: 'Apprendre' },
  ]},
  { title: 'Le labo', links: [
    { href: LAB_APP_URL, label: 'Ouvrir le labo', external: true, ctaLab: 'nav-mobile' },
    { href: ACCOUNT_URL, label: 'Compte',         external: true },
  ]},
]

export default function Nav() {
  const path = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  // « MES BOTS » opened on hover only (`group-hover`), so a keyboard user who
  // tabbed onto the button and pressed Enter got nothing: /overview and
  // /strategies were unreachable from the nav without a mouse (pre-launch
  // audit 2026-09-09, §4). The button now owns an open state and says so
  // (aria-expanded / aria-controls); hover still works through group-hover.
  const [mesBotsOpen, setMesBotsOpen] = useState(false)
  const mesBotsRef = useRef<HTMLDivElement>(null)
  const mesBotsButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!mesBotsOpen) return
    const onPointerDown = (e: MouseEvent) => {
      if (mesBotsRef.current && !mesBotsRef.current.contains(e.target as Node)) setMesBotsOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [mesBotsOpen])

  const toggleMesBots = () => setMesBotsOpen(o => !o)
  // Enter and Space are handled here, and their default is cancelled, so the
  // browser's own synthetic click on the <button> cannot toggle it a second
  // time (Enter clicks on keydown, Space on keyup — hence both handlers).
  const onMesBotsButtonKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleMesBots()
    }
  }
  const onMesBotsButtonKeyUp = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ') e.preventDefault()
  }
  const onMesBotsKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' && mesBotsOpen) {
      e.preventDefault()
      setMesBotsOpen(false)
      mesBotsButtonRef.current?.focus()
    }
  }

  const mesBotsActive = MES_BOTS_PATHS.some(p => path === p || path.startsWith(p + '/'))

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3" style={{ minHeight: 'var(--nav-h)' }}>

        {/* Logo */}
        <Link href="/" className="text-sm font-bold tracking-widest flex-shrink-0" onClick={() => setMobileOpen(false)}>
          ALGO<span className="text-positive">PROOF</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">

          {/* MES BOTS dropdown */}
          <div className="relative group" ref={mesBotsRef} onKeyDown={onMesBotsKeyDown}>
            <button
              type="button"
              ref={mesBotsButtonRef}
              aria-expanded={mesBotsOpen}
              aria-controls="mes-bots-menu"
              onClick={toggleMesBots}
              onKeyDown={onMesBotsButtonKeyDown}
              onKeyUp={onMesBotsButtonKeyUp}
              className={`text-xs font-semibold tracking-widest transition-colors flex items-center gap-1 ${mesBotsActive ? 'text-foreground' : 'text-muted hover:text-foreground'}`}
            >
              MES BOTS
              <svg className={`w-2.5 h-2.5 group-hover:opacity-100 ${mesBotsOpen ? 'opacity-100' : 'opacity-50'}`} viewBox="0 0 10 6" fill="currentColor">
                <path d="M0 0l5 6 5-6H0z"/>
              </svg>
            </button>
            <div
              id="mes-bots-menu"
              className={`absolute left-0 top-full mt-1 w-52 rounded border border-border bg-bg shadow-lg group-hover:opacity-100 group-hover:visible transition-all duration-150 ${mesBotsOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
            >
              {MES_BOTS_SUB.map(({ href, label }) => (
                <Link key={href} href={href}
                  onClick={() => setMesBotsOpen(false)}
                  className={linkClass('nav', `flex items-center justify-between gap-2 px-4 py-2.5 text-xs ${path === href ? 'font-semibold' : ''}`, { active: path === href })}>
                  {label}
                  <LinkPending />
                </Link>
              ))}
            </div>
          </div>

          {/* 3 plain hubs */}
          {HUBS.map(({ href, label }) => {
            const active = path === href || path.startsWith(href + '/')
            return (
              <Link key={href} href={href}
                className={linkClass('nav', 'inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest', { active })}>
                {label}
                <LinkPending />
              </Link>
            )
          })}

          {/* Le labo : lien simple vers l'app, clic compté */}
          <TrackedLink
            href={LAB_APP_URL}
            event="cta_lab"
            location="nav"
            className="text-xs font-semibold tracking-widest border rounded px-3 py-1 transition-colors border-positive text-positive hover:bg-positive hover:text-black"
          >
            LE LABO
          </TrackedLink>

          {/* Compte : l'auth vit sur le lab */}
          <a
            href={ACCOUNT_URL}
            className="text-xs font-semibold tracking-widest transition-colors text-muted hover:text-foreground"
          >
            COMPTE
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-muted hover:text-foreground transition-colors"
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
                {group.links.map(({ href, label, external, ctaLab }) => {
                  const active = !external && (path === href || path.startsWith(href + '/'))
                  return (
                    <Link key={href} href={href}
                      target={external ? '_blank' : undefined}
                      rel={external ? 'noopener noreferrer' : undefined}
                      onClick={() => { if (ctaLab) trackCtaLab(ctaLab); setMobileOpen(false) }}
                      className={`flex items-center justify-between gap-2 pl-7 pr-4 py-2.5 text-sm border-t border-border/30 transition-colors ${active ? 'text-foreground font-semibold' : 'text-muted hover:text-foreground'}`}>
                      <span>{label}{external ? ' ↗' : ''}</span>
                      {!external && <LinkPending />}
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
