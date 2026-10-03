import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { trackCtaLab } from '@/lib/analytics'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Lot 2 of the design audit (2026-09-25, conception §2.2 and §2.3, decided by the
// user): five flat links, one button, no dropdown, no uppercase. « Mes bots ▾ »
// hid the two pages the site exists for behind a hover; « Investir » was the one
// word of the bar that promised advice; « Apprendre » led to a page titled
// « Articles ».
const path = { value: '/' }
vi.mock('next/navigation', () => ({ usePathname: () => path.value }))
vi.mock('@/lib/analytics', () => ({ trackCtaLab: vi.fn(), trackOutboundExchange: vi.fn() }))
const { default: Nav } = await import('@/components/Nav')

const LINKS: [string, string][] = [
  ['La flotte', '/overview'],
  ['Stratégies', '/bibliotheque'],
  ['Sociétés', '/investir'],
  ['Météo', '/intelligence'],
  ['Articles', '/blog'],
]

beforeEach(() => { path.value = '/' })

describe('Nav — five flat links, one button', () => {
  it('renders the five destinations as plain links, in this order, with these words', () => {
    render(<Nav />)
    const bar = screen.getByTestId('nav-desktop')
    const links = within(bar).getAllByRole('link').filter(a => a.getAttribute('href')?.startsWith('/') && a.getAttribute('href') !== '/')
    expect(links.map(a => [a.textContent?.trim(), a.getAttribute('href')])).toEqual(LINKS)
  })

  it('has no dropdown and no shouted label', () => {
    render(<Nav />)
    expect(screen.queryByRole('button', { name: /mes bots/i })).toBeNull()
    expect(screen.queryByText(/mes bots/i)).toBeNull()
    expect(screen.queryByText(/^investir$/i)).toBeNull()
    expect(screen.queryByText(/^apprendre$/i)).toBeNull()
    expect(screen.queryByText(/météo du marché/i)).toBeNull()
    const bar = screen.getByTestId('nav-desktop')
    for (const a of within(bar).getAllByRole('link')) {
      expect(a.className, a.textContent ?? '').not.toMatch(/\buppercase\b|tracking-wid/)
    }
  })

  it('marks the current page with aria-current, and nothing else', () => {
    path.value = '/strategies/ema-cross'
    render(<Nav />)
    const bar = screen.getByTestId('nav-desktop')
    const current = within(bar).getAllByRole('link').filter(a => a.getAttribute('aria-current') === 'page')
    // « Stratégies » opens the library (D084 follow-up, user 2026-10-01); the concept
    // fiches under /strategies stay in that same section of the bar.
    expect(current.map(a => a.getAttribute('href'))).toEqual(['/bibliotheque'])
  })

  it('marks « Stratégies » on a library idea page too', () => {
    path.value = '/bibliotheque/rsi2-d1'
    render(<Nav />)
    const bar = screen.getByTestId('nav-desktop')
    const current = within(bar).getAllByRole('link').filter(a => a.getAttribute('aria-current') === 'page')
    expect(current.map(a => a.getAttribute('href'))).toEqual(['/bibliotheque'])
  })

  // Refonte finition (2026-10-02): a bot page sits under /strategies/bot/ but belongs to
  // the fleet, as its breadcrumb says; the bar lights « La flotte », not « Stratégies ».
  it('marks « La flotte » on a bot page, not « Stratégies »', () => {
    path.value = '/strategies/bot/v1-spot'
    render(<Nav />)
    const bar = screen.getByTestId('nav-desktop')
    const current = within(bar).getAllByRole('link').filter(a => a.getAttribute('aria-current') === 'page')
    expect(current.map(a => a.getAttribute('href'))).toEqual(['/overview'])
  })

  it('carries the lab as the one button of the bar, into the app, counted as nav', () => {
    vi.mocked(trackCtaLab).mockClear()
    render(<Nav />)
    // One button on every width, outside the desktop list, named after the place
    // it opens (owner, 2026-09-26: « Le labo » rather than « Tester »).
    const cta = within(screen.getByTestId('nav-bar')).getByRole('link', { name: /^le labo$/i })
    expect(cta.getAttribute('href')).toBe('https://lab.algoproof.fr/lab?ref=nav')
    // Refonte registre, lot 1: the mock-up's primary button, slate fill and ink.
    expect(cta.className).toMatch(/\bbg-button\b/)
    cta.addEventListener('click', e => e.preventDefault())
    fireEvent.click(cta)
    expect(trackCtaLab).toHaveBeenCalledWith('nav')
    // The button is the only « Le labo » of the bar: no second entry in the list.
    expect(within(screen.getByTestId('nav-bar')).getAllByText(/^le labo$/i)).toHaveLength(1)
  })

  it('keeps « Compte » reachable, as a text link that says it leaves for the lab', () => {
    render(<Nav />)
    const compte = within(screen.getByTestId('nav-desktop')).getByRole('link', { name: /compte/i })
    expect(compte.getAttribute('href')).toBe('https://lab.algoproof.fr/account?ref=nav')
    expect(compte.textContent).toMatch(/↗/)
    expect(compte.className).not.toMatch(/bg-foreground/)
  })

  // Espace-direct lot A (D075): the space holds the favorites starred on bot
  // pages; it lives on the lab, like the account, and says so the same way.
  it('reaches « Mon espace » on the lab, next to the account, on both widths', () => {
    render(<Nav />)
    const espace = within(screen.getByTestId('nav-desktop')).getByRole('link', { name: /mon espace/i })
    expect(espace.getAttribute('href')).toBe('https://lab.algoproof.fr/espace?ref=nav')
    expect(espace.textContent).toMatch(/↗/)
    fireEvent.click(screen.getByRole('button', { name: /menu/i }))
    const menu = screen.getByTestId('mobile-menu')
    expect(within(menu).getByRole('link', { name: /mon espace/i }).getAttribute('href'))
      .toBe('https://lab.algoproof.fr/espace?ref=nav')
  })

  // Refonte registre, lot 1: 64 px, the mock-up's airier bar; --nav-h follows.
  it('is 64 px tall (--nav-h)', () => {
    render(<Nav />)
    expect(screen.getByTestId('nav-bar').className).toMatch(/\bh-16\b/)
    const css = readFileSync(join(__dirname, '..', '..', 'src', 'app', 'globals.css'), 'utf8')
    expect(css).toMatch(/--nav-h:\s*64px/)
  })

  // Refonte registre, lot 1: « AlgoProof » in the mock-up's case, no longer shouted.
  it('shows the wordmark with the brand green on Proof, and nowhere else', () => {
    const { container } = render(<Nav />)
    const brand = [...container.querySelectorAll('.text-brand')]
    expect(brand.map(el => el.textContent)).toEqual(['Proof'])
    expect(brand[0].parentElement?.textContent).toBe('AlgoProof')
    expect(container.querySelector('.text-positive')).toBeNull()
  })
})

describe('Nav — the phone drawer', () => {
  const openMenu = () => fireEvent.click(screen.getByRole('button', { name: /menu/i }))

  // Refonte registre, lot 1: a 44 px target, and Escape closes the drawer and
  // hands the focus back to the button.
  it('has a 44 px menu button that controls the drawer', () => {
    render(<Nav />)
    const button = screen.getByRole('button', { name: /menu/i })
    expect(button.className).toMatch(/\bmin-h-11\b/)
    expect(button.className).toMatch(/\bmin-w-11\b/)
    expect(button).toHaveAttribute('aria-expanded', 'false')
    openMenu()
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(button.getAttribute('aria-controls')).toBe(screen.getByTestId('mobile-menu').id)
  })

  it('closes on Escape and gives the focus back to the menu button', () => {
    render(<Nav />)
    openMenu()
    expect(screen.getByTestId('mobile-menu')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByTestId('mobile-menu')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /menu/i }))
  })

  it('opens on the menu button with the same five links, flat, 48 px each', () => {
    render(<Nav />)
    expect(screen.queryByTestId('mobile-menu')).toBeNull()
    openMenu()
    const menu = screen.getByTestId('mobile-menu')
    expect(menu.querySelector('details')).toBeNull()
    expect(within(menu).queryByText(/explorer/i)).toBeNull()
    const links = within(menu).getAllByRole('link').filter(a => a.getAttribute('href')?.startsWith('/'))
    expect(links.map(a => [a.textContent?.replace(/\s+/g, ' ').trim(), a.getAttribute('href')])).toEqual(LINKS)
    for (const a of links) expect(a.className, a.textContent ?? '').toMatch(/\bh-12\b/)
  })

  it('keeps the lab button in the bar on a phone, and the lab and account at the foot of the drawer', () => {
    vi.mocked(trackCtaLab).mockClear()
    render(<Nav />)
    const barButton = within(screen.getByTestId('nav-bar')).getByRole('link', { name: /^le labo$/i })
    expect(barButton.getAttribute('href')).toBe('https://lab.algoproof.fr/lab?ref=nav')
    openMenu()
    const menu = screen.getByTestId('mobile-menu')
    const open = within(menu).getByRole('link', { name: /ouvrir le labo/i })
    expect(open.getAttribute('href')).toBe('https://lab.algoproof.fr/lab?ref=nav')
    open.addEventListener('click', e => e.preventDefault())
    fireEvent.click(open)
    expect(trackCtaLab).toHaveBeenCalledWith('nav-mobile')
    expect(within(menu).getByRole('link', { name: /compte/i }).getAttribute('href')).toBe('https://lab.algoproof.fr/account?ref=nav')
  })
})

describe('Nav — every internal link shows that it was clicked', () => {
  it('carries a pending hint on each internal destination', () => {
    const { container } = render(<Nav />)
    const internal = [...container.querySelectorAll('a[href^="/"]')]
      .filter(a => a.getAttribute('href') !== '/')   // le logo
    expect(internal.length).toBeGreaterThanOrEqual(5)
    const without = internal.filter(a => a.querySelector('[data-testid="link-pending"]') === null)
    expect(without.map(a => a.getAttribute('href'))).toEqual([])
  })

  it('carries it on the drawer entries too, once open', () => {
    const { container } = render(<Nav />)
    fireEvent.click(screen.getByRole('button', { name: /menu/i }))
    const internal = [...container.querySelectorAll('a[href^="/"]')]
      .filter(a => a.getAttribute('href') !== '/')
    const without = internal.filter(a => a.querySelector('[data-testid="link-pending"]') === null)
    expect(without.map(a => a.getAttribute('href'))).toEqual([])
  })

  // The full bar needs about 1 000 px: at 820 px « Le labo » ran off the screen
  // (2026-10-03). Below lg the menu button takes over.
  it('shows the full bar from lg only, the menu button below it', () => {
    render(<Nav />)
    expect(screen.getByTestId('nav-desktop').className).toMatch(/(^| )hidden lg:flex( |$)/)
    expect(screen.getByRole('button', { name: /menu/i }).className).toMatch(/(^| )lg:hidden( |$)/)
  })
})
