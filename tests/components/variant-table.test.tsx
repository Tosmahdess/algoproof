import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import VariantTable, { VARIANT_PAGE, type VariantRow } from '@/components/library/VariantTable'

// The variants of one idea, a register (refonte « registre », page bibliothèque,
// 2026-10-03). Audit 2026-10: n° 42 (a « n° 1…51 » nobody explained) and n° 77
// (« Réglages dans le labo » 51 times, leaving the site with no sign of it).

function row(i: number, over: Partial<VariantRow> = {}): VariantRow {
  return {
    slug: `v${i}`, number: i, name: `Canal ATR D1 Binance Futures n° ${i}`, status: 'backtest',
    state: 'Backtest seul', waitLabel: 'En attente de lancement', filters: ['Force de tendance minimale'],
    mtfCaveat: false, nAssets: 7, pfBacktest: '1,62', tradesBacktest: 258, simTrades: 0, simSign: null,
    href: `https://lab.algoproof.fr/lab?survivor=s${i}`, external: true, ...over,
  }
}

describe('VariantTable', () => {
  it('names each settings link after its variant, and says it leaves the site', () => {
    render(<VariantTable rows={[row(1), row(2)]} />)
    const links = screen.getAllByRole('link', { name: /Réglages n° \d+/ })
    expect(links.map(a => a.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Réglages n° 1 ↗ dans le labo, nouvel onglet', 'Réglages n° 2 ↗ dans le labo, nouvel onglet',
    ])
    expect(links[0].getAttribute('target')).toBe('_blank')
    expect(links[0].getAttribute('rel')).toMatch(/noopener/)
    expect(links[0].querySelector('[aria-hidden="true"]')?.textContent).toBe('↗')
  })

  it('opens a running variant on its fiche, inside the site', () => {
    render(<VariantTable rows={[row(9, { status: 'paper', state: 'En simulation', simSign: 'young', simTrades: 2, href: '/strategies/bot/v9', external: false, waitLabel: '' })]} />)
    const link = screen.getByRole('link', { name: 'Fiche n° 9' })
    expect(link.getAttribute('href')).toBe('/strategies/bot/v9')
    expect(link.getAttribute('target')).toBeNull()
  })

  it('prints « — » without colour for a variant that never ran', () => {
    const { container } = render(<VariantTable rows={[row(1)]} />)
    const cell = container.querySelector('[data-testid="variant-sim"]')!
    expect(cell.textContent).toMatch(/—/)
    expect(cell.innerHTML).not.toMatch(/text-negative|text-foreground/)
  })

  it('a variant without a number falls back to its name', () => {
    render(<VariantTable rows={[row(1, { number: null, name: 'Croisement EMA H4 Binance Futures', href: null, external: false })]} />)
    expect(screen.getByText('Croisement EMA H4 Binance Futures')).toBeTruthy()
  })

  it('shows one page, then the rest on demand', () => {
    const rows = Array.from({ length: VARIANT_PAGE + 3 }, (_, i) => row(i + 1))
    render(<VariantTable rows={rows} />)
    expect(screen.getAllByRole('link', { name: /Réglages/ })).toHaveLength(VARIANT_PAGE)
    fireEvent.click(screen.getByRole('button', { name: 'Voir les 3 suivantes' }))
    expect(screen.getAllByRole('link', { name: /Réglages/ })).toHaveLength(VARIANT_PAGE + 3)
  })

  it('keeps real money apart from the simulation in its words (R1)', () => {
    const { container } = render(<VariantTable rows={[row(3, { status: 'live', state: 'Argent réel', simSign: 'up', simTrades: 40, href: '/strategies/bot/v3', external: false })]} />)
    const text = container.querySelector('[data-testid="variant-sim"]')!.textContent
    expect(text).toMatch(/Argent réel/)
    expect(text).not.toMatch(/Simulation/)
  })
})
