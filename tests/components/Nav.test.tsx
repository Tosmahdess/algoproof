import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { trackCtaLab } from '@/lib/analytics'

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
  ['Stratégies', '/strategies'],
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
    expect(current.map(a => a.getAttribute('href'))).toEqual(['/strategies'])
  })

  it('carries the lab as the one button of the bar, into the app, counted as nav', () => {
    vi.mocked(trackCtaLab).mockClear()
    render(<Nav />)
    // One button on every width, outside the desktop list: its label shortens on a
    // phone through two spans, so the accessible name carries both words.
    const cta = within(screen.getByTestId('nav-bar')).getByRole('link', { name: /tester une stratégie/i })
    expect(cta.getAttribute('href')).toBe('https://lab.algoproof.fr/lab?ref=nav')
    expect(cta.className).toMatch(/bg-foreground/)
    cta.addEventListener('click', e => e.preventDefault())
    fireEvent.click(cta)
    expect(trackCtaLab).toHaveBeenCalledWith('nav')
    expect(screen.queryByText(/^le labo$/i)).toBeNull()
  })

  it('keeps « Compte » reachable, as a text link that says it leaves for the lab', () => {
    render(<Nav />)
    const compte = within(screen.getByTestId('nav-desktop')).getByRole('link', { name: /compte/i })
    expect(compte.getAttribute('href')).toBe('https://lab.algoproof.fr/account?ref=nav')
    expect(compte.textContent).toMatch(/↗/)
    expect(compte.className).not.toMatch(/bg-foreground/)
  })

  it('is 56 px tall (--nav-h)', () => {
    render(<Nav />)
    expect(screen.getByTestId('nav-bar').className).toMatch(/\bh-14\b/)
  })

  it('shows the wordmark with the brand green on PROOF, and nowhere else', () => {
    const { container } = render(<Nav />)
    const brand = [...container.querySelectorAll('.text-brand')]
    expect(brand.map(el => el.textContent)).toEqual(['PROOF'])
    expect(container.querySelector('.text-positive')).toBeNull()
  })
})

describe('Nav — the phone drawer', () => {
  const openMenu = () => fireEvent.click(screen.getByRole('button', { name: /menu/i }))

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
    const barButton = within(screen.getByTestId('nav-bar')).getByRole('link', { name: /^tester/i })
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
})
