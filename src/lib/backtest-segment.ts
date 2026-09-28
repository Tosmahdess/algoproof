// src/lib/backtest-segment.ts
//
// The backtest drawn before an engine bot's simulation on its equity curve (pilot
// 2026-09-25, one bot). The series is produced in the vault by
// armada/_ops/replay_backtest_segment.py: it starts on the bot's capital on 1 January,
// sizes and compounds like the paper slot, runs to the paper launch and carries its trades
// in euros.
//
// Where the backtest stops (user, 2026-09-28): at the FREEZE, the last day of the dataset
// the recipe was selected on. Nothing after it was seen by the engine, so the simulation
// starts the next day. Between the freeze and the paper launch the simulation is the
// engine's own replay (the file's points and trades); after the launch it is the paper
// ledger.
//
// Rules that hold everywhere this is read:
// - the backtest has its OWN figures (backtestStats); it never enters a simulation
//   statistic, the capital simulator or a ranking, because its period was seen during
//   selection;
// - the paper continues from the capital the curve reached at launch PROPORTIONALLY: the
//   paper risks 1 % of equity per trade, so a bot at 1121.84 instead of 1000 would have
//   traded positions 12.18 % larger. Every paper amount (curve and trades) is the ledger's
//   times `scale`; ratios are unchanged (user, 2026-09-25, and 2026-09-28 for the trades).
//
// Pure on purpose: StrategyDetail is a client component, so the data file is read in
// backtest-segment-data.ts (server side) and only ONE bot's series reaches the browser.
import type { BotStats, PerfDaily, Trade, TradeSide } from '@/lib/types'
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
  /** Last day of the recipe's selection dataset (UTC date). The backtest ends here. */
  freezeDate: string
  /** Paper launch day (UTC date). The file's last point is on this day. */
  launchDate: string
  startCapital: number
  points: { date: string; capital: number }[]
  trades: BacktestTrade[]
}

/** One calendar day of the curve. `paper` is the simulation line (replay, then ledger). */
export type JoinedRow = { date: string; backtest: number | null; paper: number | null }

export type Timeline = {
  rows: JoinedRow[]
  /** First day of the simulation: the day after the freeze. */
  simStart: string
  simStartCapital: number
  /** Capital at launch over the ledger's starting capital. */
  scale: number
  /** Replay trades opened after the freeze, then the resized paper trades; newest first. */
  simTrades: Trade[]
  simStats: BotStats
}

/** The curve, trades and figures of the simulation, or null when the file and the paper
 *  ledger disagree (the page then falls back to the plain paper curve). */
export function buildTimeline(
  seg: BacktestSegment, perfDaily: PerfDaily[], ledgerTrades: Trade[], startCapital: number,
): Timeline | null {
  const last = seg.points.at(-1)
  if (!last || last.date !== seg.launchDate) return null
  // The backtest was sized on this capital; another one would make its euros meaningless.
  if (seg.startCapital !== startCapital) return null
  // A paper point on or before launch would put the file's replay over the paper's own days.
  if (perfDaily.some(p => p.date <= seg.launchDate)) return null
  const freeze = seg.points.find(p => p.date === seg.freezeDate)
  if (!freeze || seg.freezeDate >= seg.launchDate) return null

  const scale = last.capital / startCapital
  const rows: JoinedRow[] = seg.points.map(p => ({
    date: p.date,
    backtest: p.date <= seg.freezeDate ? p.capital : null,
    // Both lines carry the freeze day, so they meet instead of leaving a gap.
    paper: p.date >= seg.freezeDate ? p.capital : null,
  }))
  // One row per calendar day after launch, the capital carried over days without a close.
  // The chart's x axis is categorical: a row per CLOSE would squeeze weeks into a sliver.
  const byDate = new Map(perfDaily.map(p => [p.date, Number(p.capital)]))
  const lastPaperDate = [...byDate.keys()].sort().at(-1)
  let capital = startCapital
  for (let d = nextDay(last.date); lastPaperDate && d <= lastPaperDate; d = nextDay(d)) {
    capital = byDate.get(d) ?? capital
    rows.push({ date: d, backtest: null, paper: round2(capital * scale) })
  }

  const replay: Trade[] = seg.trades
    .filter(t => t.opened_at > seg.freezeDate)
    .map((t, i) => ({
      id: `replay-${i}`, bot_id: seg.slug, opened_at: t.opened_at, closed_at: t.closed_at,
      asset: t.asset, side: t.side, pnl: t.pnl, reason: t.reason, is_paper: true,
      entry_price: t.entry_price, exit_price: t.exit_price,
    }))
  const paper = ledgerTrades.map(t => ({ ...t, pnl: round2(t.pnl * scale) }))
  const simTrades = [...replay, ...paper].sort((a, b) => b.closed_at.localeCompare(a.closed_at))

  const simPerf: PerfDaily[] = rows
    .filter(r => r.paper !== null)
    .map(r => ({ id: r.date, bot_id: seg.slug, date: r.date, capital: r.paper as number,
      pnl_day: 0, win_rate: null, profit_factor: null }))
  return {
    rows,
    simStart: nextDay(seg.freezeDate),
    simStartCapital: freeze.capital,
    scale,
    simTrades,
    simStats: computeBotStats(simTrades, simPerf, 'all', freeze.capital),
  }
}

/** Win rate, PF, drawdown and trade count of the backtest period alone: trades opened up
 *  to the freeze, curve up to the freeze. */
export function backtestStats(seg: BacktestSegment): BotStats {
  const perf: PerfDaily[] = seg.points
    .filter(p => p.date <= seg.freezeDate)
    .map(p => ({ id: p.date, bot_id: seg.slug, date: p.date, capital: p.capital, pnl_day: 0,
      win_rate: null, profit_factor: null }))
  return computeBotStats(backtestTrades(seg), perf, 'all', seg.startCapital)
}

export function backtestTrades(seg: BacktestSegment): BacktestTrade[] {
  return seg.trades.filter(t => t.opened_at <= seg.freezeDate)
}

function round2(x: number): number {
  return Math.round(x * 100) / 100
}

function nextDay(isoDate: string): string {
  const t = new Date(`${isoDate}T00:00:00Z`)
  t.setUTCDate(t.getUTCDate() + 1)
  return t.toISOString().slice(0, 10)
}
