// src/lib/backtest-segment.ts
//
// The backtest drawn before an engine bot's paper launch on its equity curve (pilot
// 2026-09-25, one bot). The series is produced in the vault by
// armada/_ops/replay_backtest_segment.py: it starts on the bot's capital on 1 January,
// sizes and compounds like the paper slot, and carries its trades in euros.
//
// Two rules hold everywhere it is read:
// - the backtest has its OWN figures (backtestStats); it never enters a paper statistic,
//   the capital simulator or a ranking, because its period was seen during selection;
// - the paper curve continues from the backtest's last capital PROPORTIONALLY: the paper
//   risks 1 % of equity per trade, so a bot that reached 1121.84 at launch would have
//   traded positions 12.18 % larger. Every size scales by the same factor, so its whole
//   path does too (user, 2026-09-25). Ratios (win rate, PF, drawdown %) are unchanged;
//   euro amounts on the curve are the ledger's times paperScale().
//
// Pure on purpose: StrategyDetail is a client component, so the data file is read in
// backtest-segment-data.ts (server side) and only ONE bot's series reaches the browser.
import type { BotStats, PerfDaily, TradeSide } from '@/lib/types'
import { computeBotStats } from '@/lib/stats'

export type BacktestTrade = {
  asset: string
  side: TradeSide
  opened_at: string
  closed_at: string
  entry_price: number
  exit_price: number
  reason: string
  pnl: number
}

export type BacktestSegment = {
  slug: string
  startDate: string
  /** Paper launch day (UTC date). The backtest's last point is on this day. */
  launchDate: string
  startCapital: number
  points: { date: string; capital: number }[]
  trades: BacktestTrade[]
}

export type JoinedRow = { date: string; backtest: number | null; paper: number | null }

/** Rows for a two-series chart, or null when the file and the paper ledger disagree. */
export function joinSegments(
  seg: BacktestSegment, perfDaily: PerfDaily[], startCapital: number,
): JoinedRow[] | null {
  const last = seg.points.at(-1)
  if (!last || last.date !== seg.launchDate) return null
  // The backtest was sized on this capital; another one would make its euros meaningless.
  if (seg.startCapital !== startCapital) return null
  // A paper point on or before launch would put the backtest over the paper's own days.
  if (perfDaily.some(p => p.date <= seg.launchDate)) return null
  const scale = last.capital / startCapital
  const rows: JoinedRow[] = seg.points.map(p => ({
    date: p.date, backtest: p.capital, paper: null,
  }))
  // Both series carry the launch day, so the two lines meet instead of leaving a gap.
  rows[rows.length - 1] = { date: last.date, backtest: last.capital, paper: last.capital }
  // One row per calendar day after launch, the capital carried over days without a close.
  // The chart's x axis is categorical: the backtest has a row per day, so a paper row per
  // CLOSE would squeeze five weeks of paper into a sliver (seen on the pilot, 2026-09-25).
  const byDate = new Map(perfDaily.map(p => [p.date, Number(p.capital)]))
  const lastPaperDate = [...byDate.keys()].sort().at(-1)
  let capital = startCapital
  for (let d = nextDay(last.date); lastPaperDate && d <= lastPaperDate; d = nextDay(d)) {
    capital = byDate.get(d) ?? capital
    rows.push({ date: d, backtest: null, paper: round2(capital * scale) })
  }
  return rows
}

/** Factor between the paper ledger (sized from startCapital) and the curve (sized from
 *  the capital the backtest reached at launch). */
export function paperScale(seg: BacktestSegment): number {
  const last = seg.points.at(-1)
  return last ? last.capital / seg.startCapital : 1
}

/** Win rate, PF, drawdown and trade count of the backtest period alone. */
export function backtestStats(seg: BacktestSegment): BotStats {
  const perf: PerfDaily[] = seg.points.map(p => ({
    id: p.date, bot_id: seg.slug, date: p.date, capital: p.capital, pnl_day: 0,
    win_rate: null, profit_factor: null,
  }))
  return computeBotStats(seg.trades, perf, 'all', seg.startCapital)
}

function round2(x: number): number {
  return Math.round(x * 100) / 100
}

function nextDay(isoDate: string): string {
  const t = new Date(`${isoDate}T00:00:00Z`)
  t.setUTCDate(t.getUTCDate() + 1)
  return t.toISOString().slice(0, 10)
}
