// src/lib/stats.ts
// Compute BotStats from a list of trades (full or filtered by direction).
// Pure functions — usable both server-side (initial render) and client-side
// (when the user toggles long/short filter).

import type { BotStats, PerfDaily, Trade, TradeSide } from './types'
import { toBaseAsset, type AssetFilter } from './asset'

export type DirectionFilter = 'all' | 'long' | 'short'

/** The register's side facet. Same three values as the fiche's direction
 *  switch — one vocabulary for "which side of the trades are we looking at". */
export type SideFilter = DirectionFilter

export interface DirectionBreakdown {
  total: number
  long: number
  short: number
}

export function filterTrades(
  trades: Trade[],
  filter: DirectionFilter,
  asset: AssetFilter = 'all',
): Trade[] {
  let out = filter === 'all' ? trades : trades.filter(t => t.side === filter)
  if (asset !== 'all') out = out.filter(t => toBaseAsset(t.asset) === asset)
  return out
}

export function countByDirection(trades: Trade[]): DirectionBreakdown {
  let long = 0
  for (const t of trades) if (t.side === 'long') long++
  return { total: trades.length, long, short: trades.length - long }
}

/**
 * Reconstruct a drawdown from a chronological list of pnls.
 * Used when filtering by direction — the global perf_daily is no longer the right baseline.
 */
function computeDrawdownFromTrades(trades: Trade[]): number {
  if (trades.length === 0) return 0
  const sorted = [...trades].sort((a, b) =>
    new Date(a.closed_at).getTime() - new Date(b.closed_at).getTime()
  )
  let running = 0
  let peak = 0
  let maxDd = 0
  for (const t of sorted) {
    running += t.pnl
    if (running > peak) peak = running
    const dd = peak > 0 ? (peak - running) / peak : 0
    if (dd > maxDd) maxDd = dd
  }
  return maxDd
}

/**
 * Compute BotStats from a filtered list of trades.
 *
 * - When filter === 'all', uses perf_daily to compute drawdown (existing behaviour).
 * - When filter === 'long' or 'short', drawdown is recomputed from the filtered trade pnls.
 * - latest_capital for filtered modes = startCapital + sum(filtered pnl) (synthetic).
 */
export function computeBotStats(
  allTrades: Trade[],
  perfDaily: PerfDaily[],
  filter: DirectionFilter,
  startCapital = 1000,
  asset: AssetFilter = 'all',
): BotStats {
  const trades = filterTrades(allTrades, filter, asset)
  const wins = trades.filter(t => t.pnl > 0).length
  const win_rate = trades.length > 0 ? wins / trades.length : 0

  const grossProfit = trades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0)
  const grossLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0))
  const profit_factor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0

  let max_drawdown: number
  let latest_capital: number

  // The global perf_daily curve is only a valid baseline when NO filter is active.
  // Any direction OR asset filter means we must reconstruct from the filtered trades.
  const isFiltered = filter !== 'all' || asset !== 'all'

  if (!isFiltered) {
    const capitals = perfDaily.map(p => p.capital)
    let peak = capitals[0] ?? 0
    let dd = 0
    for (const c of capitals) {
      if (c > peak) peak = c
      const cur = peak > 0 ? (peak - c) / peak : 0
      if (cur > dd) dd = cur
    }
    max_drawdown = dd
    // When perf_daily is empty (e.g. carry bots synced without an equity curve),
    // derive capital from trade pnls so P&L isn't silently zeroed. See queries.ts.
    latest_capital = capitals.length > 0
      ? capitals[capitals.length - 1]
      : startCapital + trades.reduce((s, t) => s + t.pnl, 0)
  } else {
    max_drawdown = computeDrawdownFromTrades(trades)
    const netPnl = trades.reduce((s, t) => s + t.pnl, 0)
    latest_capital = startCapital + netPnl
  }

  return {
    win_rate,
    profit_factor,
    max_drawdown,
    total_trades: trades.length,
    latest_capital,
  }
}

/**
 * The register's slice: a bot's stats recomputed on its trades of one side
 * and/or one or more assets. Wraps computeBotStats so the fiche's selector
 * and the register's pills compute the same numbers from the same trades.
 *
 * - No slice (`side === 'all'`, no asset) returns `bot.stats` ITSELF — the
 *   server-computed stats, by reference. The default view must stay
 *   bit-identical to what the page rendered before the slice existed; a test
 *   pins the identity, not just equality.
 * - Several assets are a UNION. computeBotStats only knows one asset, so the
 *   asset pre-filter happens here and `'all'` is passed down for that axis;
 *   the side still goes through computeBotStats so the drawdown/capital
 *   reconstruction path ("isFiltered") is taken whenever anything is sliced.
 * - An empty slice yields total_trades 0 / latest_capital = start_capital /
 *   PF 0 — which BotTable renders as « — », never as a zero performance.
 */
export function sliceBotStats(
  bot: { stats: BotStats; all_trades: Trade[]; perf_daily: PerfDaily[]; start_capital: number },
  side: SideFilter,
  assets: readonly string[],
): BotStats {
  if (side === 'all' && assets.length === 0) return bot.stats
  const wanted = new Set(assets.map(a => toBaseAsset(a)))
  const pool = wanted.size === 0
    ? bot.all_trades
    : bot.all_trades.filter(t => wanted.has(toBaseAsset(t.asset)))
  // Passing an EMPTY perf_daily forces computeBotStats onto its
  // reconstruct-from-trades path for capital (start + Σ pnl) even when
  // `side === 'all'`; drawdown on that path comes from the trade sequence
  // (computeDrawdownFromTrades) only when computeBotStats sees a filter, so
  // apply the side there and, for the side-'all'-with-asset case, recompute
  // the drawdown from the pool explicitly. The global perf_daily curve is
  // never a baseline for a subset of trades (same reasoning as above).
  const stats = computeBotStats(pool, [], side, bot.start_capital, 'all')
  if (side !== 'all') return stats
  return { ...stats, max_drawdown: computeDrawdownFromTrades(pool) }
}

export function sideLabel(side: TradeSide): string {
  return side === 'long' ? 'Long' : 'Short'
}
