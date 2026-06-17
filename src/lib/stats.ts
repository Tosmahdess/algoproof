// src/lib/stats.ts
// Compute BotStats from a list of trades (full or filtered by direction).
// Pure functions — usable both server-side (initial render) and client-side
// (when the user toggles long/short filter).

import type { BotStats, PerfDaily, Trade, TradeSide } from './types'
import { toBaseAsset, type AssetFilter } from './asset'

export type DirectionFilter = 'all' | 'long' | 'short'

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

export function sideLabel(side: TradeSide): string {
  return side === 'long' ? 'Long' : 'Short'
}
