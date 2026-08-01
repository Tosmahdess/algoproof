import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Nav from '@/components/Nav'

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))

describe('Nav — 4 hubs + Labo CTA', () => {
  it('renders the 4 hub labels', () => {
    render(<Nav />)
    expect(screen.getByText(/mes bots/i)).toBeDefined()
    expect(screen.getByText(/investir/i)).toBeDefined()
    expect(screen.getByText(/météo du marché/i)).toBeDefined()
    expect(screen.getByText(/apprendre/i)).toBeDefined()
  })

  it('renders the Labo CTA with its dropdown (lab surfaces + vote + membres)', () => {
    render(<Nav />)
    const cta = screen.getAllByRole('link').find(a => a.getAttribute('href') === 'https://lab.algoproof.fr' && /le labo/i.test(a.textContent ?? ''))
    expect(cta).toBeDefined()
    for (const label of [/tutoriels/i, /agents ia/i, /vote du labo/i, /membres/i]) {
      expect(screen.getByText(label)).toBeDefined()
    }
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
