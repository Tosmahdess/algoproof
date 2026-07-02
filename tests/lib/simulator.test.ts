// tests/lib/simulator.test.ts
import { describe, it, expect } from 'vitest'
import { simulateOnCapital } from '@/lib/simulator'
import type { PerfDaily } from '@/lib/types'

const pd = (date: string, capital: number, pnl_day: number): PerfDaily => ({
  id: date, bot_id: 'b', date, capital, pnl_day, win_rate: null, profit_factor: null,
})

describe('simulateOnCapital', () => {
  it('returns null on empty history', () => {
    expect(simulateOnCapital([], 1000, 500)).toBeNull()
  })

  it('scales total P&L linearly to the chosen capital', () => {
    // 1000 → 1100 on start capital 1000 = +10% → +50€ on 500€
    const perf = [pd('2026-01-01', 1050, 50), pd('2026-01-02', 1100, 50)]
    const r = simulateOnCapital(perf, 1000, 500)
    expect(r?.pnlEur).toBeCloseTo(50)
  })

  it('computes the worst month in € at the chosen capital', () => {
    const perf = [
      pd('2026-01-10', 1050, 50),
      pd('2026-02-10', 990, -60),   // worst month: −60 on 1000 → −30 on 500
      pd('2026-03-10', 1010, 20),
    ]
    const r = simulateOnCapital(perf, 1000, 500)
    expect(r?.worstMonthEur).toBeCloseTo(-30)
    expect(r?.worstMonthLabel).toBe('2026-02')
  })

  it('worst month is 0 when every month is positive', () => {
    const perf = [pd('2026-01-10', 1050, 50), pd('2026-02-10', 1100, 50)]
    const r = simulateOnCapital(perf, 1000, 1000)
    expect(r?.worstMonthEur).toBe(0)
    expect(r?.worstMonthLabel).toBeNull()
  })

  it('computes max drawdown in € at the chosen capital', () => {
    // peak 1200 → trough 1080 = −10% of peak → on 2000€: peak 2400, trough 2160 → −240€
    const perf = [
      pd('2026-01-01', 1200, 200),
      pd('2026-01-02', 1080, -120),
      pd('2026-01-03', 1150, 70),
    ]
    const r = simulateOnCapital(perf, 1000, 2000)
    expect(r?.maxDrawdownEur).toBeCloseTo(-240)
  })

  it('reports the observed period', () => {
    const perf = [pd('2026-01-01', 1010, 10), pd('2026-03-15', 1020, 10)]
    const r = simulateOnCapital(perf, 1000, 500)
    expect(r?.firstDate).toBe('2026-01-01')
    expect(r?.lastDate).toBe('2026-03-15')
  })

  it('returns null when startCapital is 0 (cannot scale)', () => {
    expect(simulateOnCapital([pd('2026-01-01', 10, 10)], 0, 500)).toBeNull()
  })
})
