// tests/lib/trade-cents.test.ts
//
// Astra audit, point 7 (29/09): the five KAMA simulation trades, each rounded on its own,
// read +9,83 EUR while the result above them read +9,84 EUR. The displayed trades must add
// up to the displayed result: cents are spread by largest remainder, at most one per trade.
// A gap wider than that is not a rounding and stays visible.
import { describe, it, expect } from 'vitest'
import { reconcileCents } from '@/lib/backtest-segment'

const sum = (xs: { pnl: number }[]) => Math.round(xs.reduce((s, x) => s + x.pnl, 0) * 100)

describe('reconcileCents', () => {
  it('makes the displayed trades add up to the displayed total', () => {
    // five trades whose independent roundings lose a cent
    const trades = [10.884, 10.884, 10.884, -11.3649, -11.4649].map(pnl => ({ pnl }))
    const out = reconcileCents(trades, 9.84)
    expect(sum(out)).toBe(984)
    for (const [i, t] of out.entries()) {
      expect(Math.abs(t.pnl - trades[i].pnl)).toBeLessThan(0.01 + 1e-9)
      expect(Math.round(t.pnl * 100) / 100).toBe(t.pnl)       // whole cents
    }
  })

  it('leaves a real gap visible instead of hiding it', () => {
    const trades = [1, 2, 3].map(pnl => ({ pnl }))
    const out = reconcileCents(trades, 6.5)                    // 50 cents apart
    expect(out.map(t => t.pnl)).toEqual([1, 2, 3])
  })

  it('keeps the other fields and the order', () => {
    const out = reconcileCents([{ pnl: 0.333, id: 'a' }, { pnl: 0.333, id: 'b' }, { pnl: 0.333, id: 'c' }], 1)
    expect(out.map(t => t.id)).toEqual(['a', 'b', 'c'])
    expect(sum(out)).toBe(100)
  })
})
