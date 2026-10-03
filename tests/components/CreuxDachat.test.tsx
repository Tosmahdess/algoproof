// tests/components/CreuxDachat.test.tsx
//
// Audit 2026-10, n° 51: the price dips were printed in red and orange
// (« −65 % ») on a page that says it reads no price, and the companies were
// cited without a link. A dip is a figure with its sign, in ink; a company the
// index knows links its fiche.
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CreuxDachat } from '@/components/CreuxDachat'
import type { FicheIndex } from '@/lib/investir'

const INDEX: FicheIndex[] = [{
  slug: 'crown-castle-inc', cik: 1, name: 'Crown Castle Inc.', currency: 'USD', core: true,
  famille: null, symbole: 'CCI', alertes: [], non_lus: [], n_lus: 7,
}]

afterEach(() => vi.unstubAllGlobals())

async function monter() {
  const today = new Date().toISOString()
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => [
      { ticker: 'CCI', asset_name: 'CROWN CASTLE', drawdown_pct: -65.2, signal_level: 'crash', alerted_at: today },
      { ticker: 'ZZZ', asset_name: 'Inconnue SA', drawdown_pct: -31, signal_level: 'major', alerted_at: today },
      { ticker: 'AVAV', asset_name: 'AeroVironment', drawdown_pct: -61, signal_level: 'crash', alerted_at: today },
    ],
  })))
  const vue = render(<CreuxDachat index={INDEX} horsPerimetre={[{ slug: 'aerovironment', name: 'AeroVironment', ticker: 'AVAV' }]} />)
  await screen.findByText('Inconnue SA')
  return vue
}

describe('CreuxDachat', () => {
  it('writes a dip with its sign, in no status colour', async () => {
    const { container } = await monter()
    expect(container.textContent).toContain('−65')
    expect(container.innerHTML).not.toMatch(/text-(negative|severe|warning)/)
  })

  it('links a company the index knows to its fiche, and leaves an unknown one plain', async () => {
    await monter()
    expect(screen.getByRole('link', { name: 'Crown Castle Inc.' }).getAttribute('href')).toBe('/investir/crown-castle-inc')
    expect(screen.queryByRole('link', { name: 'Inconnue SA' })).toBeNull()
    // An out-of-scope company has a fiche too.
    expect(screen.getByRole('link', { name: 'AeroVironment' }).getAttribute('href')).toBe('/investir/aerovironment')
  })

  it('opens with a rule and a section title, no card around it', async () => {
    await monter()
    const section = screen.getByTestId('creux')
    expect(section.className).toContain('border-t')
    expect(section.className).not.toMatch(/rounded|bg-card/)
  })
})
