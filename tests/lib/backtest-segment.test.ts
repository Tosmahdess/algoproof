// tests/lib/backtest-segment.test.ts
//
// 2026-09-25 pilot: the equity curve of an engine bot shows, before its paper launch, the
// recipe's backtest from 1 January. The backtest never enters a paper figure; it is drawn
// as a second series that ends exactly where the paper series starts.
import { describe, it, expect } from 'vitest'
import { joinSegments, type BacktestSegment } from '@/lib/backtest-segment'
import { getBacktestSegment } from '@/lib/backtest-segment-data'
import type { PerfDaily } from '@/lib/types'

const seg: BacktestSegment = {
  slug: 'arm-test',
  launchDate: '2026-08-21',
  points: [
    { date: '2026-08-19', capital: 950 },
    { date: '2026-08-20', capital: 980 },
    { date: '2026-08-21', capital: 1000 },
  ],
}

const pd = (date: string, capital: number): PerfDaily => ({
  id: date, bot_id: 'b', date, capital, pnl_day: 0, win_rate: null, profit_factor: null,
})

describe('joinSegments', () => {
  it('puts the backtest and the paper in two keys that meet on the launch day', () => {
    const rows = joinSegments(seg, [pd('2026-08-24', 990), pd('2026-08-26', 1000)], 1000)!
    expect(rows.map(r => r.date)).toEqual(
      ['2026-08-19', '2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23', '2026-08-24',
       '2026-08-25', '2026-08-26'])
    expect(rows.map(r => r.backtest)).toEqual([950, 980, 1000, null, null, null, null, null])
    // the paper starts flat on the launch day and carries its capital over the days
    // without a close, so the time axis keeps one row per day on both sides of the launch
    expect(rows.map(r => r.paper)).toEqual([null, null, 1000, 1000, 1000, 990, 990, 1000])
  })

  it('rescales the backtest when the bot does not start at the capital the file ends on', () => {
    const rows = joinSegments(seg, [pd('2026-08-31', 495)], 500)!
    expect(rows[0].backtest).toBeCloseTo(475)
    expect(rows[2].backtest).toBeCloseTo(500)
    expect(rows[2].paper).toBe(500)
  })

  it('refuses to draw when a paper day falls on or before the launch day', () => {
    // a paper point before launch means the file and the ledger disagree on the date
    expect(joinSegments(seg, [pd('2026-08-21', 990)], 1000)).toBeNull()
    expect(joinSegments(seg, [pd('2026-08-10', 990)], 1000)).toBeNull()
  })

  it('refuses a file whose last point is not the launch day', () => {
    const bad = { ...seg, points: seg.points.slice(0, 2) }
    expect(joinSegments(bad, [pd('2026-08-31', 990)], 1000)).toBeNull()
  })

  it('draws the backtest with a flat paper when the bot has not closed a trade yet', () => {
    const rows = joinSegments(seg, [], 1000)!
    expect(rows.at(-1)).toEqual({ date: '2026-08-21', backtest: 1000, paper: 1000 })
  })
})

describe('getBacktestSegment', () => {
  it('serves the pilot bot and nothing else', () => {
    const s = getBacktestSegment('arm-kamacross-d1-head00')!
    expect(s.launchDate).toBe('2026-08-21')
    expect(s.points[0].date).toBe('2026-01-01')
    expect(s.points.at(-1)).toEqual({ date: '2026-08-21', capital: 1000 })
    expect(getBacktestSegment('v1-spot')).toBeNull()
  })
})
