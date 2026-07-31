// src/lib/fleet-sort.ts
// The default sort is deliberately NOT performance. Three reasons, all of which
// belong in the code and not only in a design doc:
//
//  - Regulatory: ordering by profit factor is an implicit recommendation, and
//    the first thing a visitor sees becomes "the bot that earns the most".
//  - Statistical: the top of a performance ranking is mechanically populated by
//    small-sample luck. The backtest engine this site is built around exists to
//    demonstrate exactly that; reproducing it in the UI would contradict the
//    product.
//  - Behavioural: it trains the visitor to chase the top of the table, which is
//    the mistake the site claims to teach people to avoid.
//
// Manual performance sorting stays available. The low-sample badge is what makes
// it honest, and it is applied at the row level by the caller.
import type { SortKey, SortDir } from './bot-filters'

export interface SortableBot {
  status: string
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
  pnl: 'P&L',
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
  }
}

export function sortFleet<T extends SortableBot>(bots: T[], sort: SortKey, dir: SortDir): T[] {
  return [...bots].sort((a, b) => {
    // Archived bots stay at the bottom under every sort and both directions.
    // They are kept visible for honesty, not to compete for the top of a list.
    const aArch = a.status === 'archived' ? 1 : 0
    const bArch = b.status === 'archived' ? 1 : 0
    if (aArch !== bArch) return aArch - bArch

    const va = valueOf(a, sort)
    const vb = valueOf(b, sort)
    return dir === 'asc' ? va - vb : vb - va
  })
}
