// src/lib/fleet-sort.ts
// The register of « La flotte » is ONE list, from the best result to the least
// good (owner decision, 2026-10-02, refonte « registre », lot 4). Until then the
// default was the history (trades descending) and every sort ran inside three
// tiers, proven / rodage / untraded, which cut the ranking in two.
//
// What used to justify the tiers is now carried by the row, not by the order:
//  - a bot under LOW_SAMPLE_TRADES wears « rodage » on its row, so a result on
//    four trades never reads as a proven one;
//  - a bot without a trade has no result: it goes last under every sort and in
//    both directions, with « — » and no colour (audit 2026-10, n° 6);
//  - real money and simulation share the list, never a total: the two totals
//    above it stay separate (FleetTotals) and each row carries its regime.
//
// The other sorts stay on offer (FleetFilterBar « Trier par »), wired through
// FleetRegister's push() so the choice lands in the URL like a filter.
import type { SortKey, SortDir } from './bot-filters'
import { isCarryFamily, pnlPct } from './display'

export interface SortableBot {
  /** Optional so a bare fixture still sorts; the last tie-break. */
  name?: string
  status: string
  /** Optional so a bare fixture still sorts; the register always carries it. */
  family?: string
  start_capital: number
  stats: {
    total_trades: number
    win_rate: number
    profit_factor: number
    max_drawdown: number
    latest_capital: number
  }
}

export const SORT_LABELS: Record<SortKey, string> = {
  proven: 'Historique (le plus éprouvé d\'abord)',
  trades: 'Nombre de trades',
  win_rate: 'Taux de gain',
  profit_factor: 'Facteur de profit',
  max_drawdown: 'Drawdown',
  pnl: 'Résultat, du meilleur au moins bon',
  pct: '% de gain',
}

// A figure the table prints as « — » is not a figure to rank: a carry bot's PF
// and win rate (display.ts), a PF with no loss to divide by (>= 999). Measured
// 2026-09-30 on the served page: the grid and the funding bot, both « — »,
// topped the PF sort. They go last, whatever the direction.
function unmeasured(bot: SortableBot, key: SortKey): boolean {
  if (key === 'profit_factor') return isCarryFamily(bot.family) || bot.stats.profit_factor >= 999
  if (key === 'win_rate') return isCarryFamily(bot.family)
  return false
}

function valueOf(bot: SortableBot, key: SortKey): number {
  switch (key) {
    case 'proven':
    case 'trades':
      return bot.stats.total_trades
    case 'win_rate':
      return bot.stats.win_rate
    case 'profit_factor':
      return bot.stats.profit_factor
    case 'max_drawdown':
      return bot.stats.max_drawdown
    case 'pnl':
      return bot.stats.latest_capital - bot.start_capital
    case 'pct':
      return pnlPct(bot.stats.latest_capital, bot.start_capital)
  }
}

const untraded = (bot: SortableBot) => bot.stats.total_trades === 0
const resultOf = (bot: SortableBot) => bot.stats.latest_capital - bot.start_capital

// Ties, whatever the sort: the better result, then the longer history, then the
// name, so equal figures keep one order from one render to the next.
function tieBreak(a: SortableBot, b: SortableBot): number {
  const ra = resultOf(a)
  const rb = resultOf(b)
  if (ra !== rb) return rb - ra
  if (a.stats.total_trades !== b.stats.total_trades) return b.stats.total_trades - a.stats.total_trades
  return (a.name ?? '').localeCompare(b.name ?? '', 'fr')
}

/** The register's order. `pnl` desc is the default: the euro result the row
 *  prints (latest capital minus the bot's own start), best first. */
export function sortFleet<T extends SortableBot>(bots: T[], sort: SortKey, dir: SortDir): T[] {
  return [...bots].sort((a, b) => {
    // Archived bots stay at the bottom under every sort and both directions.
    // They are kept visible for honesty, not to compete for the top of a list.
    const aArch = a.status === 'archived' ? 1 : 0
    const bArch = b.status === 'archived' ? 1 : 0
    if (aArch !== bArch) return aArch - bArch

    // No trade, no result: last, by name, whatever the sort and the direction.
    const za = untraded(a)
    const zb = untraded(b)
    if (za !== zb) return za ? 1 : -1
    if (za) return (a.name ?? '').localeCompare(b.name ?? '', 'fr')

    const ua = unmeasured(a, sort)
    const ub = unmeasured(b, sort)
    if (ua !== ub) return ua ? 1 : -1
    if (ua) return tieBreak(a, b)

    const va = valueOf(a, sort)
    const vb = valueOf(b, sort)
    // Equal first: Infinity - Infinity is NaN (two PFs with no loss yet), and a
    // NaN comparator leaves the order to the engine's whim.
    if (va === vb) return tieBreak(a, b)
    return dir === 'asc' ? (va < vb ? -1 : 1) : (va > vb ? -1 : 1)
  })
}
