import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import EngineSummary from '@/components/home/EngineSummary'
import EngineSurvival, { pickExamples } from '@/components/home/EngineSurvival'
import FleetLine from '@/components/home/FleetLine'
import { engineBaseLabel } from '@/lib/engine-base-labels'
import type { FunnelCounts } from '@/lib/funnel'

// Counter-audit 2026-09-26, Astra's proposal chosen by the owner: the funnel's
// bars became a typographic summary in the hero (« ≈ 1 sur 500 »), and the
// per-strategy detail lives on /strategies only, as chosen examples and a full
// alphabetical list, never a ranking (a ranking reads as a profitability ranking).

const COUNTS: FunnelCounts = {
  n_swept: 42_288_798, n_judged: 1_805_709, n_go: 3_642, n_marginal: 274_091, n_no_go: 1_527_976,
  n_promoted: 75, n_live: 3,
  by_base: [
    { base: 'KeltnerBreak', judged: 88_479, retained: 608, timeframes: ['M30', 'H1', 'H4', 'D1'] },
    { base: 'ATRChannel', judged: 99_487, retained: 533, timeframes: ['D1'] },
    { base: 'EMAcross', judged: 91_596, retained: 36, timeframes: ['M30', 'H1', 'H4', 'D1'] },
    { base: 'BrandNewBase', judged: 20_004, retained: 0, timeframes: ['D1'] },
    { base: 'OscDivergence', judged: 20_000, retained: 0, timeframes: ['D1'] },
    { base: 'HurstRegime', judged: 1_325, retained: 0, timeframes: ['D1'] },
  ],
}

describe('EngineSummary (hero)', () => {
  it('leads with the ratio and its denominator, then the three verdicts with their counts', () => {
    render(<EngineSummary counts={COUNTS} />)
    const block = screen.getByTestId('home-funnel')
    const text = block.textContent!.replace(/\s/g, ' ')
    expect(text).toMatch(/≈ 1 sur 500/)
    expect(text).toMatch(/Sur 1 805 709 configurations jugées/)
    const verdicts = screen.getByTestId('funnel-verdicts').textContent!.replace(/\s/g, ' ')
    expect(verdicts).toMatch(/Recalées\s*1 527 976/)
    expect(verdicts).toMatch(/En sursis\s*274 091/)
    expect(verdicts).toMatch(/Candidates\s*3 642/)
  })

  it('says what a configuration is and what a candidate may do, in plain words', () => {
    render(<EngineSummary counts={COUNTS} />)
    const text = screen.getByTestId('home-funnel').textContent!
    expect(text).toMatch(/Une configuration, c’est une stratégie avec des réglages précis\./)
    expect(text).toMatch(/Une candidate peut être surveillée en simulation, sans argent\./)
  })

  it('keeps the swept corpus in a fold that never calls the unjudged rejected', () => {
    render(<EngineSummary counts={COUNTS} />)
    const text = screen.getByTestId('home-funnel').textContent!.replace(/\s/g, ' ')
    expect(text).toMatch(/42 288 798 balayées/)
    expect(text).toMatch(/Les autres n’ont pas de verdict de ces quatre épreuves/)
  })

  it('counts no bot and links no cimetière (D059)', () => {
    render(<EngineSummary counts={COUNTS} />)
    const block = screen.getByTestId('home-funnel')
    expect(block.textContent).not.toMatch(/bots? en service|en argent réel/)
    expect(block.querySelector('a[href*="cimetiere"]')).toBeNull()
    expect(block.querySelector('[data-dot]')).toBeNull()
  })

  it('renders nothing without counts', () => {
    const { container } = render(<EngineSummary counts={null} />)
    expect(container.innerHTML).toBe('')
  })
})

describe('EngineSurvival (/strategies)', () => {
  it('shows three chosen examples: the highest share, EMA cross, and one that kept none', () => {
    expect(pickExamples(COUNTS.by_base!).map(b => b.base)).toEqual(['KeltnerBreak', 'EMAcross', 'BrandNewBase'])
    render(<EngineSurvival counts={COUNTS} />)
    const rows = within(screen.getByTestId('survival-examples')).getAllByTestId('survival-row')
    expect(rows).toHaveLength(3)
    expect(rows[0].textContent!.replace(/\s/g, ' ')).toMatch(/≈ 1 sur 146/)
    expect(rows[2].textContent!.replace(/\s/g, ' ')).toMatch(/Aucune sur 20 004/)
  })

  it('says the examples are chosen, not a ranking, and that it counts candidates, not gains', () => {
    render(<EngineSurvival counts={COUNTS} />)
    const text = screen.getByTestId('survival-section').textContent!
    expect(text).toMatch(/Trois exemples choisis, pas un classement/)
    expect(text).toMatch(/ce tableau ne mesure pas leurs gains/)
  })

  it('lists every strategy of the engine alphabetically in the fold, with its horizons', () => {
    render(<EngineSurvival counts={COUNTS} />)
    const rows = within(screen.getByTestId('survival-full')).getAllByTestId('survival-full-row')
    expect(rows).toHaveLength(6)
    const names = rows.map(r => r.querySelector('[data-name]')!.textContent)
    expect(names).toEqual([...names].sort((a, b) => a!.localeCompare(b!, 'fr')))
    const keltner = rows.find(r => /Keltner/.test(r.textContent!))!
    expect(keltner.textContent).toMatch(/30 min, 1 h, 4 h, 1 jour/)
  })

  it('links a strategy to its page when there is one, and keeps an unknown base readable', () => {
    render(<EngineSurvival counts={COUNTS} />)
    expect(screen.getAllByRole('link', { name: /Cassure Keltner/ })[0].getAttribute('href')).toBe('/strategies/keltner')
    expect(screen.getAllByText('BrandNewBase').length).toBeGreaterThan(0)
  })

  it('counts no bot', () => {
    render(<EngineSurvival counts={COUNTS} />)
    expect(screen.getByTestId('survival-section').textContent).not.toMatch(/bots? en service/)
  })

  it('renders nothing without a per-strategy breakdown', () => {
    const { container } = render(<EngineSurvival counts={{ ...COUNTS, by_base: undefined }} />)
    expect(container.innerHTML).toBe('')
  })
})

describe('FleetLine (home, beside the engine summary, D059)', () => {
  it('counts the bots once, total and real money, with the cimetière link', () => {
    render(<FleetLine live={3} paper={93} />)
    const line = screen.getByTestId('home-fleet-line')
    expect(line.textContent).toMatch(/96 bots en service/)
    expect(line.textContent).toMatch(/3 avec mon argent/)
    expect(within(line).getByRole('link', { name: /cimetière/i }).getAttribute('href')).toBe('https://lab.algoproof.fr/cockpit/cimetiere?ref=funnel')
  })
})

describe('engineBaseLabel', () => {
  it('names the bases in French, and falls back to the raw key', () => {
    expect(engineBaseLabel('KeltnerBreak')).toBe('Cassure Keltner')
    expect(engineBaseLabel('EMAcross')).toBe('Croisement EMA')
    expect(engineBaseLabel('BrandNewBase')).toBe('BrandNewBase')
  })
})
