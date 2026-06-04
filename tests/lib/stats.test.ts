import { describe, it, expect } from 'vitest'
import { computeBotStats, countByDirection, filterTrades } from '@/lib/stats'
import type { PerfDaily, Trade } from '@/lib/types'

const makeTrade = (id: string, side: 'long' | 'short', pnl: number, day: string): Trade => ({
  id,
  bot_id: 'bot1',
  opened_at: `${day}T08:00:00Z`,
  closed_at: `${day}T12:00:00Z`,
  asset: 'BTC/USDT',
  side,
  pnl,
  reason: 'take_profit_1',
  is_paper: true,
})

const trades: Trade[] = [
  makeTrade('1', 'long',   +10, '2026-05-01'),
  makeTrade('2', 'long',    -5, '2026-05-02'),
  makeTrade('3', 'short',  +20, '2026-05-03'),
  makeTrade('4', 'short',  -15, '2026-05-04'),
  makeTrade('5', 'long',   +30, '2026-05-05'),
]

const perfDaily: PerfDaily[] = [
  { id: '1', bot_id: 'bot1', date: '2026-05-01', capital: 1010, pnl_day: 10,  win_rate: null, profit_factor: null },
  { id: '2', bot_id: 'bot1', date: '2026-05-02', capital: 1005, pnl_day: -5,  win_rate: null, profit_factor: null },
  { id: '3', bot_id: 'bot1', date: '2026-05-03', capital: 1025, pnl_day: 20,  win_rate: null, profit_factor: null },
  { id: '4', bot_id: 'bot1', date: '2026-05-04', capital: 1010, pnl_day: -15, win_rate: null, profit_factor: null },
  { id: '5', bot_id: 'bot1', date: '2026-05-05', capital: 1040, pnl_day: 30,  win_rate: null, profit_factor: null },
]

describe('countByDirection', () => {
  it('counts long and short trades', () => {
    expect(countByDirection(trades)).toEqual({ total: 5, long: 3, short: 2 })
  })

  it('handles empty list', () => {
    expect(countByDirection([])).toEqual({ total: 0, long: 0, short: 0 })
  })
})

describe('filterTrades', () => {
  it('returns all trades for "all" filter', () => {
    expect(filterTrades(trades, 'all')).toHaveLength(5)
  })

  it('returns only long trades', () => {
    expect(filterTrades(trades, 'long').every(t => t.side === 'long')).toBe(true)
    expect(filterTrades(trades, 'long')).toHaveLength(3)
  })

  it('returns only short trades', () => {
    expect(filterTrades(trades, 'short').every(t => t.side === 'short')).toBe(true)
    expect(filterTrades(trades, 'short')).toHaveLength(2)
  })
})

describe('computeBotStats', () => {
  it('all filter: uses perf_daily for drawdown, includes all trades', () => {
    const s = computeBotStats(trades, perfDaily, 'all')
    expect(s.total_trades).toBe(5)
    // 3 wins (10, 20, 30) out of 5 = 0.6
    expect(s.win_rate).toBeCloseTo(0.6)
    // PF = (10+20+30) / (5+15) = 60/20 = 3.0
    expect(s.profit_factor).toBeCloseTo(3.0)
    // latest_capital from perf_daily
    expect(s.latest_capital).toBe(1040)
  })

  it('long filter: re-computes stats and drawdown from long trades only', () => {
    const s = computeBotStats(trades, perfDaily, 'long')
    expect(s.total_trades).toBe(3)
    // 2 wins (10, 30) out of 3 ≈ 0.667
    expect(s.win_rate).toBeCloseTo(2 / 3)
    // PF = (10+30) / 5 = 8.0
    expect(s.profit_factor).toBeCloseTo(8.0)
    // synthetic latest_capital = 1000 + 10 - 5 + 30 = 1035
    expect(s.latest_capital).toBe(1035)
    // DD recomputed from cumulative long pnls: 10 → 5 → 35. Peak 10 → trough 5 = 50% relative drop
    expect(s.max_drawdown).toBeCloseTo(0.5)
  })

  it('short filter: synthetic capital reflects only short pnls', () => {
    const s = computeBotStats(trades, perfDaily, 'short')
    expect(s.total_trades).toBe(2)
    expect(s.win_rate).toBeCloseTo(0.5)
    // PF = 20 / 15 = 1.333
    expect(s.profit_factor).toBeCloseTo(20 / 15)
    expect(s.latest_capital).toBe(1005) // 1000 + 20 - 15
  })

  it('returns zero stats for an empty filtered list', () => {
    const longsOnly = filterTrades(trades, 'long')
    const s = computeBotStats(longsOnly, perfDaily, 'short')
    expect(s.total_trades).toBe(0)
    expect(s.win_rate).toBe(0)
    expect(s.profit_factor).toBe(0)
    expect(s.max_drawdown).toBe(0)
    expect(s.latest_capital).toBe(1000)
  })
})

describe('computeBotStats — empty perf_daily fallback (carry bots without equity curve)', () => {
  // Root cause of /overview vs /performance P&L mismatch: a bot with trades but no
  // perf_daily (e.g. funding-rate-harvest) must derive latest_capital from trade pnls,
  // not fall back to startCapital (which yields P&L = 0).
  it('falls back to startCapital + sum(pnl) when perf_daily is empty (filter all)', () => {
    const trades = [
      makeTrade('a', 'long', 5, '2026-06-01'),
      makeTrade('b', 'long', 3.79, '2026-06-02'),
    ]
    const s = computeBotStats(trades, [], 'all', 400)
    expect(s.latest_capital).toBeCloseTo(408.79, 2)
  })

  it('still uses the last perf_daily capital when present', () => {
    const trades = [makeTrade('a', 'long', 5, '2026-06-01')]
    const perf: PerfDaily[] = [{ id: 'p1', bot_id: 'bot1', date: '2026-06-01', capital: 1005, pnl_day: 5, win_rate: null, profit_factor: null }]
    const s = computeBotStats(trades, perf, 'all', 1000)
    expect(s.latest_capital).toBe(1005)
  })
})
