// src/lib/backtest-segment.ts
//
// The backtest drawn before an engine bot's paper launch on its equity curve (pilot
// 2026-09-25, one bot). The series is produced in the vault by
// armada/_ops/replay_backtest_segment.py, which sizes and compounds like the paper slot and
// ends on the paper's starting capital. It is a separate series on purpose: no statistic,
// simulator or ranking on the site reads it, only the chart.
//
// Pure on purpose: StrategyDetail is a client component, so the data file is read in
// backtest-segment-data.ts (server side) and only ONE bot's series reaches the browser.
import type { PerfDaily } from '@/lib/types'

export type BacktestSegment = {
  slug: string
  /** Paper launch day (UTC date). The backtest's last point is on this day. */
  launchDate: string
  points: { date: string; capital: number }[]
}

export type JoinedRow = { date: string; backtest: number | null; paper: number | null }

/** Rows for a two-series chart, or null when the file and the paper ledger disagree. */
export function joinSegments(
  seg: BacktestSegment, perfDaily: PerfDaily[], startCapital: number,
): JoinedRow[] | null {
  const last = seg.points.at(-1)
  if (!last || last.date !== seg.launchDate || !(last.capital > 0)) return null
  // A paper point on or before launch would put the backtest over the paper's own days.
  if (perfDaily.some(p => p.date <= seg.launchDate)) return null
  const scale = startCapital / last.capital
  const rows: JoinedRow[] = seg.points.map(p => ({
    date: p.date, backtest: p.capital * scale, paper: null,
  }))
  // Both series carry the launch day, so the two lines meet instead of leaving a gap.
  rows[rows.length - 1] = { date: last.date, backtest: startCapital, paper: startCapital }
  // One row per calendar day after launch, the capital carried over days without a close.
  // The chart's x axis is categorical: the backtest has a row per day, so a paper row per
  // CLOSE would squeeze five weeks of paper into a sliver (seen on the pilot, 2026-09-25).
  const byDate = new Map(perfDaily.map(p => [p.date, Number(p.capital)]))
  const lastPaperDate = [...byDate.keys()].sort().at(-1)
  let capital = startCapital
  for (let d = nextDay(last.date); lastPaperDate && d <= lastPaperDate; d = nextDay(d)) {
    capital = byDate.get(d) ?? capital
    rows.push({ date: d, backtest: null, paper: capital })
  }
  return rows
}

function nextDay(isoDate: string): string {
  const t = new Date(`${isoDate}T00:00:00Z`)
  t.setUTCDate(t.getUTCDate() + 1)
  return t.toISOString().slice(0, 10)
}
