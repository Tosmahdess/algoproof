import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Nav from '@/components/Nav'

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))

// Pre-launch audit 2026-09-09 (§4, keyboard navigation): the « MES BOTS »
// menu opened on hover only. A keyboard user tabbed onto the button, pressed
// Enter, and nothing happened: /overview and /strategies were unreachable
// from the nav without a mouse. The button now owns the open state, exposes
// it (aria-expanded / aria-controls), opens on click, Enter and Space, closes
// on Escape (focus back on the button) and on a click outside. Hover keeps
// working through the group-hover classes.
describe('Nav — « MES BOTS » is usable from the keyboard', () => {
  const button = () => screen.getByRole('button', { name: /mes bots/i })

  it('is closed by default and exposes its state', () => {
    render(<Nav />)
    const b = button()
    expect(b).toHaveAttribute('aria-expanded', 'false')
    const menuId = b.getAttribute('aria-controls')
    expect(menuId).toBeTruthy()
    expect(document.getElementById(menuId!)).not.toBeNull()
  })

  it('opens and closes on click', () => {
    render(<Nav />)
    fireEvent.click(button())
    expect(button()).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(button())
    expect(button()).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens and closes on Enter and on Space', () => {
    render(<Nav />)
    fireEvent.keyDown(button(), { key: 'Enter' })
    expect(button()).toHaveAttribute('aria-expanded', 'true')
    fireEvent.keyDown(button(), { key: 'Enter' })
    expect(button()).toHaveAttribute('aria-expanded', 'false')
    fireEvent.keyDown(button(), { key: ' ' })
    expect(button()).toHaveAttribute('aria-expanded', 'true')
    fireEvent.keyDown(button(), { key: ' ' })
    expect(button()).toHaveAttribute('aria-expanded', 'false')
  })

  it('Escape closes the menu and returns focus to the button', () => {
    render(<Nav />)
    fireEvent.click(button())
    const menu = document.getElementById(button().getAttribute('aria-controls')!)!
    const first = menu.querySelector('a')!
    first.focus()
    fireEvent.keyDown(first, { key: 'Escape' })
    expect(button()).toHaveAttribute('aria-expanded', 'false')
    expect(document.activeElement).toBe(button())
  })

  it('a click outside closes the menu', () => {
    render(<Nav />)
    fireEvent.click(button())
    expect(button()).toHaveAttribute('aria-expanded', 'true')
    fireEvent.mouseDown(document.body)
    expect(button()).toHaveAttribute('aria-expanded', 'false')
  })

  it('the menu is visible when open, hidden when closed, and still opens on hover', () => {
    render(<Nav />)
    const menu = document.getElementById(button().getAttribute('aria-controls')!)!
    expect(menu.className).toMatch(/\binvisible\b/)
    expect(menu.className).toMatch(/group-hover:visible/)
    fireEvent.click(button())
    expect(menu.className).toMatch(/\bvisible\b/)
    expect(menu.className).not.toMatch(/\binvisible\b/)
  })
})

describe('Nav — 4 hubs + Labo CTA', () => {
  it('renders the 4 hub labels', () => {
    render(<Nav />)
    expect(screen.getByText(/mes bots/i)).toBeDefined()
    expect(screen.getByText(/investir/i)).toBeDefined()
    expect(screen.getByText(/météo du marché/i)).toBeDefined()
    expect(screen.getByText(/apprendre/i)).toBeDefined()
  })

  // 2026-08-21 (user decision): LE LABO is a plain link, no dropdown. The old
  // sub-links (tutoriels, agents, vote, membres) are gone from the nav.
  it('renders the Labo CTA as a plain link, without the old dropdown', () => {
    render(<Nav />)
    const cta = screen.getAllByRole('link').find(a => a.getAttribute('href') === 'https://lab.algoproof.fr' && /le labo/i.test(a.textContent ?? ''))
    expect(cta).toBeDefined()
    for (const label of [/tutoriels/i, /agents ia/i, /vote du labo/i, /membres/i]) {
      expect(screen.queryByText(label)).toBeNull()
    }
  })

  // The account lives on the lab (magic link + subscription state); this site
  // has no auth of its own, so COMPTE must point at lab.algoproof.fr/account.
  it('links COMPTE to the lab account page', () => {
    render(<Nav />)
    const compte = screen.getAllByRole('link').find(a => /^compte$/i.test(a.textContent ?? ''))
    expect(compte).toBeDefined()
    expect(compte!.getAttribute('href')).toBe('https://lab.algoproof.fr/account')
  })

  // The library moved to this site on 2026-07-31: linking the lab's
  // /bibliotheque would 308 straight back here.
  it('no longer links the lab bibliotheque (the library lives here now)', () => {
    render(<Nav />)
    expect(screen.queryByText(/bibliothèque/i)).toBeNull()
    const hrefs = screen.getAllByRole('link').map(a => a.getAttribute('href') ?? '')
    expect(hrefs.some(h => h.includes('/bibliotheque'))).toBe(false)
    expect(hrefs).toContain('/strategies')
  })

  it('drops the old jargon top-level items', () => {
    render(<Nav />)
    expect(screen.queryByText(/patrimoine/i)).toBeNull()
    expect(screen.queryByText(/^analyses$/i)).toBeNull()
    expect(screen.queryByText(/^intelligence$/i)).toBeNull()
  })
})
