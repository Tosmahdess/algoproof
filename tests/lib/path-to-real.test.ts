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
  it('0-trade bot: gauges at 0, nothing met except DD', () => {
    const r = evaluatePathToReal({ ...stats, total_trades: 0, profit_factor: 0, win_rate: 0, max_drawdown: 0 })
    expect(r.met).toBe(1)             // only DD <= 15% is trivially met
  })
  it('per-bot overrides', () => {
    const r = evaluatePathToReal(stats, { ...DEFAULT_LIVE_GATE, minTrades: 10 })
    expect(r.criteria.find(c => c.format === 'count')?.met).toBe(true)
  })
})
