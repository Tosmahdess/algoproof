// tests/lib/backtest-segment.test.ts
//
// 2026-09-25 pilot: the equity curve of an engine bot starts at its capital on 1 January,
// runs the recipe's backtest to the paper launch, then the paper continues from there. The
// backtest has its own figures and never enters a paper figure.
import { describe, it, expect } from 'vitest'
import { backtestStats, joinSegments, paperScale, type BacktestSegment } from '@/lib/backtest-segment'
import { getBacktestSegment } from '@/lib/backtest-segment-data'
import { paperIsUp } from '@/components/EquityCurve'
import type { PerfDaily } from '@/lib/types'

const seg: BacktestSegment = {
  slug: 'arm-test',
  startDate: '2026-08-19',
  launchDate: '2026-08-21',
  startCapital: 1000,
  points: [
    { date: '2026-08-19', capital: 1000 },
    { date: '2026-08-20', capital: 1030 },
    { date: '2026-08-21', capital: 1100 },
  ],
  trades: [
    { asset: 'ETH-USDT', side: 'long', opened_at: '2026-08-19', closed_at: '2026-08-20',
      entry_price: 1, exit_price: 1.1, reason: 'tp_hit', pnl: 30 },
    { asset: 'ARB-USDT', side: 'short', opened_at: '2026-08-19', closed_at: '2026-08-21',
      entry_price: 1, exit_price: 0.9, reason: 'tp_hit', pnl: 80 },
    { asset: 'OP-USDT', side: 'short', opened_at: '2026-08-20', closed_at: '2026-08-21',
      entry_price: 1, exit_price: 1.1, reason: 'sl_hit', pnl: -10 },
  ],
}

const pd = (date: string, capital: number): PerfDaily => ({
  id: date, bot_id: 'b', date, capital, pnl_day: 0, win_rate: null, profit_factor: null,
})

describe('joinSegments', () => {
  it('starts on the capital and continues the paper from where the backtest ended', () => {
    const rows = joinSegments(seg, [pd('2026-08-23', 990), pd('2026-08-24', 1008.77)], 1000)!
    expect(rows.map(r => r.date)).toEqual(
      ['2026-08-19', '2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23', '2026-08-24'])
    expect(rows.map(r => r.backtest)).toEqual([1000, 1030, 1100, null, null, null])
    // the paper sizes 1 % of equity per trade, so starting on 1100 instead of 1000 scales
    // its whole path by 1.1 (user, 2026-09-25): 990 -> 1089, 1008.77 -> 1109.65
    expect(rows.map(r => r.paper)).toEqual([null, null, 1100, 1100, 1089, 1109.65])
  })

  it('refuses a bot whose capital is not the one the backtest starts on', () => {
    expect(joinSegments(seg, [pd('2026-08-23', 495)], 500)).toBeNull()
  })

  it('refuses to draw when a paper day falls on or before the launch day', () => {
    expect(joinSegments(seg, [pd('2026-08-21', 990)], 1000)).toBeNull()
    expect(joinSegments(seg, [pd('2026-08-10', 990)], 1000)).toBeNull()
  })

  it('refuses a file whose last point is not the launch day', () => {
    const bad = { ...seg, points: seg.points.slice(0, 2) }
    expect(joinSegments(bad, [pd('2026-08-31', 990)], 1000)).toBeNull()
  })

  it('draws the backtest with a flat paper when the bot has not closed a trade yet', () => {
    const rows = joinSegments(seg, [], 1000)!
    expect(rows.at(-1)).toEqual({ date: '2026-08-21', backtest: 1100, paper: 1100 })
  })
})

describe('paperScale', () => {
  it('is the backtest end over the starting capital', () => {
    expect(paperScale(seg)).toBeCloseTo(1.1)
  })
})

describe('backtestStats', () => {
  it('computes the backtest figures from its own trades and curve only', () => {
    const s = backtestStats(seg)
    expect(s.total_trades).toBe(3)
    expect(s.win_rate).toBeCloseTo(2 / 3)
    expect(s.profit_factor).toBeCloseTo(110 / 10)
    expect(s.latest_capital).toBe(1100)
    expect(s.max_drawdown).toBe(0)
  })

  it('reads the drawdown on the daily curve', () => {
    const s = backtestStats({ ...seg, points: [
      { date: '2026-08-19', capital: 1000 }, { date: '2026-08-20', capital: 1200 },
      { date: '2026-08-21', capital: 900 }] })
    expect(s.max_drawdown).toBeCloseTo(0.25)
  })
})

describe('getBacktestSegment', () => {
  it('serves the pilot bot and nothing else', () => {
    const s = getBacktestSegment('arm-kamacross-d1-head00')!
    expect(s.launchDate).toBe('2026-08-21')
    expect(s.points[0]).toEqual({ date: '2026-01-01', capital: 1000 })
    expect(s.points.at(-1)!.date).toBe('2026-08-21')
    expect(s.trades.length).toBe(18)
    expect(getBacktestSegment('v1-spot')).toBeNull()
  })
})

describe('paperIsUp', () => {
  it('reads the paper against its own launch level, not the starting capital', () => {
    // backtest gained to 1100, then the paper LOST 1 %: still above 1000, must be red
    const rows = joinSegments(seg, [pd('2026-08-23', 990)], 1000)!
    expect(rows.at(-1)!.paper).toBe(1089)
    expect(paperIsUp(rows, seg.launchDate)).toBe(false)
    const up = joinSegments(seg, [pd('2026-08-23', 1010)], 1000)!
    expect(paperIsUp(up, seg.launchDate)).toBe(true)
  })
})
