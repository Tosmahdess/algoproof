// tests/components/BacktestBlock.test.tsx
//
// 2026-09-25 pilot, second pass (user: « le taux de gain, facteur de profit, DD etc ne
// disent que les nouveaux »): the backtest period gets its own figures and its own trade
// list, in a block that names what it is. Never merged into the paper figures.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import BacktestBlock from '@/components/BacktestBlock'
import type { BacktestSegment } from '@/lib/backtest-segment'

const seg: BacktestSegment = {
  slug: 'arm-test', startDate: '2026-01-01', freezeDate: '2026-08-01', replayEnd: '2026-08-21',
  startCapital: 1000,
  points: [{ date: '2026-01-01', capital: 1000 }, { date: '2026-08-01', capital: 1020 },
    { date: '2026-08-21', capital: 1100 }],
  trades: [
    { asset: 'ETH-USDT', side: 'long', opened_at: '2026-02-01', closed_at: '2026-02-03',
      entry_price: 1, exit_price: 1.1, reason: 'tp_hit', pnl: 30 },
    { asset: 'ARB-USDT', side: 'short', opened_at: '2026-03-01', closed_at: '2026-03-02',
      entry_price: 1, exit_price: 1.1, reason: 'sl_hit', pnl: -10 },
    // opened after the freeze: a simulation trade, never listed in the backtest block
    { asset: 'OP-USDT', side: 'long', opened_at: '2026-08-05', closed_at: '2026-08-07',
      entry_price: 1, exit_price: 1.1, reason: 'tp_hit', pnl: 80 },
  ],
}

const view = () => render(<BacktestBlock segment={seg} />).container
const text = () => view().textContent?.replace(/\s+/g, ' ') ?? ''

describe('BacktestBlock', () => {
  it('names the period and says it was seen during selection', () => {
    const t = text()
    expect(t).toContain('Backtest du 1er janvier au 1er août 2026')
    expect(t).toMatch(/données de sa sélection/)
    expect(t).toMatch(/flatteurs par construction/)
  })

  it('shows the backtest figures and its result in euros', () => {
    const t = text()
    // Refonte lot 3: the figures are named in words (« WR », « PF » before).
    expect(t).toContain('Taux de gain')
    expect(t).toContain('Facteur de profit')
    // stops at the freeze: 1020, not the 1100 the replay reached by the launch
    expect(t).toMatch(/\+20,00\s€/)
  })

  // Refonte lot 3 (2026-10-02): the register reads oldest to newest, with the cumul after
  // each trade from the backtest's starting capital.
  it('lists every backtest trade up to the freeze, oldest first, with its cumul', () => {
    const rows = view().querySelectorAll('tbody tr')
    expect(rows.length).toBe(2)
    expect(rows[0].textContent).toContain('ETH-USDT')
    expect(rows[1].textContent).toContain('ARB-USDT')
    expect(rows[1].textContent).toMatch(/1\s020,00\s€/)
  })

  it('keeps its result out of the simulation colours', () => {
    const block = view().querySelector('[data-testid="backtest-block"]')!
    const result = [...block.querySelectorAll('span')].find(s => /à part/.test(s.textContent ?? ''))!
    expect(result.className).toContain('text-muted')
  })

  it('carries no em dash (site-wide ban)', () => {
    expect(text()).not.toMatch(/—/)
  })
})
