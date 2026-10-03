import { describe, it, expect } from 'vitest'
import { evaluatePathToReal, DEFAULT_LIVE_GATE } from '@/lib/path-to-real'

const stats = { win_rate: 0.38, profit_factor: 1.42, max_drawdown: 0.062, total_trades: 17, latest_capital: 1000 }

describe('evaluatePathToReal', () => {
  it('evaluates the 4 APEX criteria', () => {
    const r = evaluatePathToReal(stats)
    expect(r.criteria).toHaveLength(4)
    expect(r.met).toBe(2)             // PF 1.42 ok, DD 6.2% ok, WR 38% ko, trades 17 ko
    expect(r.allMet).toBe(false)
  })
  it('boundary values pass (DD exactly 15%, WR exactly 40%)', () => {
    const r = evaluatePathToReal({ ...stats, max_drawdown: 0.15, win_rate: 0.4, total_trades: 40, profit_factor: 1.3 })
    expect(r.allMet).toBe(true)
  })
  // Refonte lot 3 (audit 2026-10, constat 6): « Drawdown 0,0 % ✓ » on a bot that never
  // traded validated a criterion on nothing. Without a trade, the three ratios are not
  // measurable and none of them is met; the trade count stays measurable (0 / 40).
  it('0-trade bot: nothing met, the ratios not yet measurable', () => {
    const r = evaluatePathToReal({ ...stats, total_trades: 0, profit_factor: 0, win_rate: 0, max_drawdown: 0 })
    expect(r.met).toBe(0)
    expect(r.criteria.filter(c => !c.measurable).map(c => c.format)).toEqual(['ratio', 'pct', 'pct'])
  })
  it('labels its thresholds with a decimal comma', () => {
    expect(evaluatePathToReal(stats).criteria[0].label).toBe('Facteur de profit ≥ 1,3')
  })
  it('per-bot overrides', () => {
    const r = evaluatePathToReal(stats, { ...DEFAULT_LIVE_GATE, minTrades: 10 })
    expect(r.criteria.find(c => c.format === 'count')?.met).toBe(true)
  })
})
