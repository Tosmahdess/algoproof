import { describe, it, expect } from 'vitest'
import { simulationTotalSeries } from '@/lib/fleet-curves'
import type { PerfDaily } from '@/lib/types'

// Lot 4 of the design audit (2026-09-25, conception §5.2): the 30-day curves show
// the real-money bots and ONE series for the simulation, never twelve bots in
// twelve colours. That series is the sum, day by day, of every paper bot's P&L
// (its last known capital minus its start capital), so a bot that has no point
// yet on a day counts for nothing, and a bot whose last point is older carries it
// forward.
const pd = (date: string, capital: number): PerfDaily =>
  ({ id: `${date}-${capital}`, bot_id: 'b', date, capital, pnl_day: 0, win_rate: null, profit_factor: null })

describe('simulationTotalSeries', () => {
  it('sums each bot\'s P&L per day, carrying the last known point forward', () => {
    const bots = [
      { start_capital: 1000, perf_daily: [pd('2026-09-01', 1010), pd('2026-09-03', 1030)] },
      { start_capital: 1000, perf_daily: [pd('2026-09-02', 990)] },
    ]
    expect(simulationTotalSeries(bots, '2026-08-25')).toEqual([
      { date: '2026-09-01', capital: 10 },   // B has no point yet
      { date: '2026-09-02', capital: 0 },    // 10 carried + (−10)
      { date: '2026-09-03', capital: 20 },   // 30 + (−10 carried)
    ])
  })

  it('carries a point older than the window into it, without emitting that day', () => {
    const bots = [
      { start_capital: 1000, perf_daily: [pd('2026-08-01', 1005)] },
      { start_capital: 500, perf_daily: [pd('2026-09-10', 520)] },
    ]
    expect(simulationTotalSeries(bots, '2026-09-01')).toEqual([
      { date: '2026-09-10', capital: 25 },
    ])
  })

  it('renders an empty series when no bot has a point in or before the window', () => {
    expect(simulationTotalSeries([{ start_capital: 1000, perf_daily: [] }], '2026-09-01')).toEqual([])
  })

  it('rounds to the cent', () => {
    const bots = [
      { start_capital: 1000, perf_daily: [pd('2026-09-01', 1000.1)] },
      { start_capital: 1000, perf_daily: [pd('2026-09-01', 1000.2)] },
    ]
    expect(simulationTotalSeries(bots, '2026-09-01')).toEqual([{ date: '2026-09-01', capital: 0.3 }])
  })
})
