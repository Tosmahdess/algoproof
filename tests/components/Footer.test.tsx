import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Footer from '@/components/Footer'

describe('Footer sitemap', () => {
  it('renders all 5 hub column titles', () => {
    render(<Footer />)
    for (const t of ['Mes bots', 'Investir', 'Météo du marché', 'Apprendre', 'Le labo']) {
      expect(screen.getByRole('heading', { name: t, level: 3 })).toBeDefined()
    }
  })

  it('links the previously-orphan pages', () => {
    render(<Footer />)
    expect(screen.getByRole('link', { name: /en règle/i })).toBeDefined()       // /mica
    expect(screen.getByRole('link', { name: /ma méthode/i })).toBeDefined()     // /preuve
    expect(screen.getByRole('link', { name: /démarrer/i })).toBeDefined()       // /start
  })

  // /journal was removed 2026-08-08 — guard the removal so a copy/paste never revives a link
  // to a page that now 301s to the home.
  it('no longer links the removed public journal', () => {
    render(<Footer />)
    expect(screen.queryByRole('link', { name: /ce qui a changé/i })).toBeNull()
  })

  // Pre-launch audit 2026-09-09: the financial disclaimer — the site's default
  // rule, on every page — was the least readable line of the site, measured at
  // 2,20:1 (text-xs text-muted/50). Full opacity, 13 px minimum. The contrast
  // of `muted` itself is checked from the tokens in tests/lib/design-contrast.
  it('renders the financial disclaimer at full opacity and at least 13 px', () => {
    render(<Footer />)
    const p = screen.getByText(/pas un conseil financier/i)
    const cls = p.className
    expect(cls).not.toMatch(/text-muted\/\d+/)
    expect(cls).not.toMatch(/\bopacity-\d+/)
    expect(cls).toMatch(/text-\[(1[3-9]|[2-9]\d)px\]|text-(sm|base|lg)\b/)
    expect(cls).not.toMatch(/\btext-(xs|\[1[0-2]px\])/)
  })
})
