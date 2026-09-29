// tests/lib/backtest-segment.test.ts
//
// The equity curve of an engine bot starts at its capital on 1 January. The backtest runs to
// the last day of the dataset the recipe was selected on (its freeze); the simulation starts
// the next day, because nothing after the freeze was seen by the engine (user, 2026-09-28).
// Between the freeze and the paper launch the simulation is the engine's replay; after the
// launch it is the paper ledger, resized on the capital the curve had reached. The backtest
// has its own figures and never enters a simulation figure.
import { describe, it, expect } from 'vitest'
import { backtestStats, buildTimeline, timelinePerfDaily, type BacktestSegment } from '@/lib/backtest-segment'
import { paperIsUp } from '@/components/EquityCurve'
import type { PerfDaily, Trade } from '@/lib/types'

// Backtest 16/08-18/08 (freeze 18/08), replay 19/08-21/08, paper launched 21/08.
const seg: BacktestSegment = {
  slug: 'arm-test',
  startDate: '2026-08-16',
  freezeDate: '2026-08-18',
  replayEnd: '2026-08-21',
  startCapital: 1000,
  points: [
    { date: '2026-08-16', capital: 1000 },
    { date: '2026-08-17', capital: 1030 },
    { date: '2026-08-18', capital: 1020 },
    { date: '2026-08-19', capital: 1020 },
    { date: '2026-08-20', capital: 1100 },
    { date: '2026-08-21', capital: 1100 },
  ],
  trades: [
    { asset: 'ETH-USDT', side: 'long', opened_at: '2026-08-16', closed_at: '2026-08-17',
      entry_price: 1, exit_price: 1.1, reason: 'tp_hit', pnl: 30 },
    { asset: 'OP-USDT', side: 'short', opened_at: '2026-08-17', closed_at: '2026-08-18',
      entry_price: 1, exit_price: 1.1, reason: 'sl_hit', pnl: -10 },
    // opened after the freeze: part of the simulation, not of the backtest
    { asset: 'ARB-USDT', side: 'short', opened_at: '2026-08-19', closed_at: '2026-08-20',
      entry_price: 1, exit_price: 0.9, reason: 'tp_hit', pnl: 80 },
  ],
}

const pd = (date: string, capital: number): PerfDaily => ({
  id: date, bot_id: 'b', date, capital, pnl_day: 0, win_rate: null, profit_factor: null,
})

const tr = (id: string, closed: string, pnl: number): Trade => ({
  id, bot_id: 'b', opened_at: closed, closed_at: `${closed}T00:00:00+00:00`, asset: 'ETH-USDT',
  side: 'long', pnl, reason: null, is_paper: true, entry_price: 1, exit_price: 1,
})

const ledger = [tr('p2', '2026-08-24', 18.77), tr('p1', '2026-08-23', -10)]
const perf = [pd('2026-08-23', 990), pd('2026-08-24', 1008.77)]

describe('buildTimeline', () => {
  it('draws the backtest to the freeze and the simulation from there on', () => {
    const t = buildTimeline(seg, perf, ledger, 1000)!
    expect(t.rows.map(r => r.date)).toEqual([
      '2026-08-16', '2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21',
      '2026-08-22', '2026-08-23', '2026-08-24'])
    expect(t.rows.map(r => r.backtest)).toEqual(
      [1000, 1030, 1020, null, null, null, null, null, null])
    // both lines carry the freeze day so they meet; the ledger is resized by 1100/1000
    expect(t.rows.map(r => r.paper)).toEqual(
      [null, null, 1020, 1020, 1100, 1100, 1100, 1089, 1109.65])
    expect(t.simStart).toBe('2026-08-19')
    expect(t.simStartCapital).toBe(1020)
    expect(t.scale).toBeCloseTo(1.1)
  })

  it('resizes the paper trades on the capital reached and adds the replay after the freeze', () => {
    const t = buildTimeline(seg, perf, ledger, 1000)!
    // newest first, as the trade table lists them
    expect(t.simTrades.map(x => x.asset)).toEqual(['ETH-USDT', 'ETH-USDT', 'ARB-USDT'])
    expect(t.simTrades.map(x => x.pnl)).toEqual([20.65, -11, 80])
  })

  it('computes the simulation figures from the freeze only', () => {
    const s = buildTimeline(seg, perf, ledger, 1000)!.simStats
    expect(s.total_trades).toBe(3)
    expect(s.win_rate).toBeCloseTo(2 / 3)
    expect(s.profit_factor).toBeCloseTo(100.65 / 11)
    expect(s.latest_capital).toBe(1109.65)
    // peak 1100, trough 1089: the backtest's own dip (1030 -> 1020) is not in it
    expect(s.max_drawdown).toBeCloseTo(0.01)
  })

  it('draws a flat simulation when nothing has closed since the freeze', () => {
    const quiet = { ...seg, points: seg.points.map(p => ({ ...p, capital: p.date > '2026-08-18' ? 1020 : p.capital })),
      trades: seg.trades.slice(0, 2) }
    const t = buildTimeline(quiet, [], [], 1000)!
    expect(t.rows.at(-1)).toEqual({ date: '2026-08-21', backtest: null, paper: 1020 })
    expect(t.simStats.total_trades).toBe(0)
    expect(t.simStats.latest_capital).toBe(1020)
  })

  it('refuses a bot whose capital is not the one the backtest starts on', () => {
    expect(buildTimeline(seg, [pd('2026-08-23', 495)], [], 500)).toBeNull()
  })

  it('refuses when a paper day falls on or before the launch day', () => {
    expect(buildTimeline(seg, [pd('2026-08-21', 990)], [], 1000)).toBeNull()
    expect(buildTimeline(seg, [pd('2026-08-10', 990)], [], 1000)).toBeNull()
  })

  it('refuses a file whose last point is not the launch day', () => {
    const bad = { ...seg, points: seg.points.slice(0, 5) }
    expect(buildTimeline(bad, perf, ledger, 1000)).toBeNull()
  })

  it('files an intraday trade opened on the freeze day under the backtest (dates, not stamps)', () => {
    // an H4 entry at 20:00 on the freeze day was seen by the engine; compared as a string
    // '2026-08-18T20:00' > '2026-08-18' would have sent it to the simulation (Fable, 29/09)
    const h4 = { ...seg, trades: [...seg.trades.slice(0, 2),
      { ...seg.trades[1], opened_at: '2026-08-18T20:00:00+00:00', closed_at: '2026-08-18T23:00:00+00:00', pnl: 0 },
      seg.trades[2]] }
    expect(backtestStats(h4).total_trades).toBe(3)
    expect(buildTimeline(h4, perf, ledger, 1000)!.simTrades.length).toBe(3)
  })

  it('refuses a freeze that is not before the launch or not on the curve', () => {
    expect(buildTimeline({ ...seg, freezeDate: '2026-08-21' }, perf, ledger, 1000)).toBeNull()
    expect(buildTimeline({ ...seg, freezeDate: '2026-08-10' }, perf, ledger, 1000)).toBeNull()
  })
})

describe('timelinePerfDaily', () => {
  it('turns the whole curve, backtest then simulation, into one daily series', () => {
    const t = buildTimeline(seg, perf, ledger, 1000)!
    const p = timelinePerfDaily(t, 'arm-test')
    expect(p.map(x => x.date)).toEqual(t.rows.map(r => r.date))
    expect(p.map(x => x.capital)).toEqual(
      [1000, 1030, 1020, 1020, 1100, 1100, 1100, 1089, 1109.65])
    // pnl_day is the day's move of the curve, so the capital simulator's worst month adds up
    expect(p.map(x => x.pnl_day)).toEqual([0, 30, -10, 0, 80, 0, 0, -11, 20.65])
  })
})

describe('backtestStats', () => {
  it('computes the backtest figures from the trades opened up to the freeze only', () => {
    const s = backtestStats(seg)
    expect(s.total_trades).toBe(2)
    expect(s.win_rate).toBeCloseTo(1 / 2)
    expect(s.profit_factor).toBeCloseTo(30 / 10)
    expect(s.latest_capital).toBe(1020)
    expect(s.max_drawdown).toBeCloseTo(10 / 1030)
  })
})

describe('paperIsUp', () => {
  it('reads the simulation against its own start, not the starting capital', () => {
    // backtest gained to 1100, then the simulation LOST: still above 1000, must be red
    const t = buildTimeline(seg, [pd('2026-08-23', 900)], [tr('p', '2026-08-23', -100)], 1000)!
    expect(t.rows.at(-1)!.paper).toBe(990)
    expect(paperIsUp(t.rows, seg.freezeDate)).toBe(false)
    const up = buildTimeline(seg, perf, ledger, 1000)!
    expect(paperIsUp(up.rows, seg.freezeDate)).toBe(true)
  })
})
