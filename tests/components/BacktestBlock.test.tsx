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
  slug: 'arm-test', startDate: '2026-01-01', launchDate: '2026-08-21', startCapital: 1000,
  points: [{ date: '2026-01-01', capital: 1000 }, { date: '2026-08-21', capital: 1020 }],
  trades: [
    { asset: 'ETH-USDT', side: 'long', opened_at: '2026-02-01', closed_at: '2026-02-03',
      entry_price: 1, exit_price: 1.1, reason: 'tp_hit', pnl: 30 },
    { asset: 'ARB-USDT', side: 'short', opened_at: '2026-03-01', closed_at: '2026-03-02',
      entry_price: 1, exit_price: 1.1, reason: 'sl_hit', pnl: -10 },
  ],
}

const view = () => render(<BacktestBlock segment={seg} />).container
const text = () => view().textContent?.replace(/\s+/g, ' ') ?? ''

describe('BacktestBlock', () => {
  it('names the period and says it was seen during selection', () => {
    const t = text()
    expect(t).toContain('Backtest du 1er janvier au 21 août 2026')
    expect(t).toMatch(/déjà vues pendant sa sélection/)
  })

  it('shows the backtest figures and its result in euros', () => {
    const t = text()
    expect(t).toContain('Taux de gain')
    expect(t).toContain('Facteur de profit')
    expect(t).toContain('+20.00€')
  })

  it('lists every backtest trade, the most recent first', () => {
    const rows = view().querySelectorAll('tbody tr')
    expect(rows.length).toBe(2)
    expect(rows[0].textContent).toContain('ARB-USDT')
  })

  it('carries no em dash (site-wide ban)', () => {
    expect(text()).not.toMatch(/—/)
  })
})
