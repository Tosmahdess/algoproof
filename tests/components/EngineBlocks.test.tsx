import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import EngineSummary from '@/components/home/EngineSummary'
import EngineSurvival from '@/components/home/EngineSurvival'
import { engineBaseLabel } from '@/lib/engine-base-labels'
import type { FunnelCounts } from '@/lib/funnel'

// Counter-audit 2026-09-26: the funnel's four full-width bars were replaced by a
// unit chart in the hero (« 1 sur 500 » you can count) and a per-strategy view
// of who survives. The numbers and their rules (D059, cockpit counting) stay.

const COUNTS: FunnelCounts = {
  n_swept: 42_288_798, n_judged: 1_805_709, n_go: 3_642, n_marginal: 274_091, n_no_go: 1_527_976,
  n_promoted: 75, n_live: 3,
  by_base: [
    { base: 'KeltnerBreak', judged: 88_479, retained: 608 },
    { base: 'ATRChannel', judged: 99_487, retained: 533 },
    { base: 'ORB', judged: 14_718, retained: 58 },
    { base: 'TEMAcross', judged: 84_764, retained: 314 },
    { base: 'ConnorsRSI', judged: 51_140, retained: 179 },
    { base: 'RSI2', judged: 24_867, retained: 83 },
    { base: 'EMAcross', judged: 91_596, retained: 36 },
    { base: 'SupertrendADX', judged: 46_496, retained: 14 },
    { base: 'FVG', judged: 20_250, retained: 1 },
    { base: 'BrandNewBase', judged: 20_004, retained: 0 },
    { base: 'OrderBlock', judged: 20_000, retained: 0 },
    // Too few judged to rank: listed in the full table only.
    { base: 'HurstRegime', judged: 1_325, retained: 0 },
  ],
}

describe('EngineSummary (hero)', () => {
  it('prints the three counts and the verdict split, never a bot', () => {
    render(<EngineSummary counts={COUNTS} />)
    const block = screen.getByTestId('home-funnel')
    const text = block.textContent!.replace(/\s/g, ' ')
    expect(text).toMatch(/42 288 798/)
    expect(text).toMatch(/1 805 709/)
    expect(text).toMatch(/3 642/)
    expect(screen.getByTestId('funnel-verdicts').textContent!.replace(/\s/g, ' ')).toMatch(/1 527 976 recalées · 84 %/)
    expect(text).toMatch(/1 sur 500 jugées/)
    expect(text).not.toMatch(/bots? en service|en argent réel/)
    expect(block.querySelector('a[href*="cimetiere"]')).toBeNull()
  })

  it('draws one dot per judged configuration of the ratio, exactly one lit', () => {
    render(<EngineSummary counts={COUNTS} />)
    const grid = screen.getByTestId('engine-unit-chart')
    expect(grid.querySelectorAll('[data-dot]')).toHaveLength(500)
    expect(grid.querySelectorAll('[data-dot="lit"]')).toHaveLength(1)
    expect(grid.getAttribute('aria-label')).toMatch(/1 sur 500/)
  })

  it('renders nothing without counts', () => {
    const { container } = render(<EngineSummary counts={null} />)
    expect(container.innerHTML).toBe('')
  })
})

describe('EngineSurvival (per strategy)', () => {
  it('lists the strategies that keep the most and the least, among those judged enough', () => {
    render(<EngineSurvival counts={COUNTS} live={3} paper={93} />)
    const most = within(screen.getByTestId('survival-most')).getAllByTestId('survival-row')
    const least = within(screen.getByTestId('survival-least')).getAllByTestId('survival-row')
    expect(most[0].textContent).toMatch(/Cassure Keltner/)
    expect(most[0].textContent!.replace(/\s/g, ' ')).toMatch(/1 sur 146/)
    // A strategy that kept nothing says so, in words.
    expect(least.at(-1)!.textContent!.replace(/\s/g, ' ')).toMatch(/aucune sur 20 000/)
    // Hurst is judged 1 325 times: not ranked.
    expect(screen.getByTestId('survival-most').textContent).not.toMatch(/Hurst/)
    expect(screen.getByTestId('survival-least').textContent).not.toMatch(/Hurst/)
  })

  it('links a strategy to its page when there is one, and keeps an unknown base readable', () => {
    render(<EngineSurvival counts={COUNTS} live={3} paper={93} />)
    const keltner = screen.getAllByRole('link', { name: /Cassure Keltner/ })[0]
    expect(keltner.getAttribute('href')).toBe('/strategies/keltner')
    expect(screen.getAllByText('BrandNewBase').length).toBeGreaterThan(0)
  })

  it('keeps every strategy, ranked or not, in the full list', () => {
    render(<EngineSurvival counts={COUNTS} live={3} paper={93} />)
    const full = screen.getByTestId('survival-full')
    expect(within(full).getAllByTestId('survival-full-row')).toHaveLength(12)
  })

  it('writes the fleet beside it, outside the engine block (D059)', () => {
    render(<EngineSurvival counts={COUNTS} live={3} paper={93} />)
    const line = screen.getByTestId('home-fleet-line')
    expect(line.textContent).toMatch(/96 bots en service/)
    expect(within(line).getByRole('link', { name: /cimetière/i }).getAttribute('href')).toBe('https://lab.algoproof.fr/cockpit/cimetiere?ref=funnel')
  })

  it('without a per-strategy breakdown, still writes the fleet line and nothing else', () => {
    render(<EngineSurvival counts={{ ...COUNTS, by_base: undefined }} live={3} paper={93} />)
    expect(screen.queryByTestId('survival-most')).toBeNull()
    expect(screen.getByTestId('home-fleet-line').textContent).toMatch(/96 bots en service/)
  })
})

describe('engineBaseLabel', () => {
  it('names every base the engine publishes today in French, and falls back to the raw key', () => {
    expect(engineBaseLabel('KeltnerBreak')).toBe('Cassure Keltner')
    expect(engineBaseLabel('EMAcross')).toBe('Croisement EMA')
    expect(engineBaseLabel('BrandNewBase')).toBe('BrandNewBase')
  })
})
