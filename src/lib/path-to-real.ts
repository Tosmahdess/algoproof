import type { BotStats } from './types'

// The standard APEX paper→real gate (MIGRATION_BF_HL criteria).
export interface LiveGate {
  minPf: number
  minWinRate: number   // fraction (0.4 = 40%)
  minTrades: number
  maxDrawdown: number  // fraction (0.15 = 15%)
}

export const DEFAULT_LIVE_GATE: LiveGate = { minPf: 1.3, minWinRate: 0.4, minTrades: 40, maxDrawdown: 0.15 }

export interface PathCriterion {
  label: string
  value: number
  target: number
  direction: 'gte' | 'lte'
  met: boolean
  format: 'ratio' | 'pct' | 'count'
  /** False when the bot has no trade yet: a ratio of nothing is not a value, and a
   *  drawdown of 0 % on no trade is not a criterion met (audit 2026-10, constat 6). */
  measurable: boolean
}

const fr = (n: number) => String(n).replace('.', ',')

export function evaluatePathToReal(stats: BotStats, gate: LiveGate = DEFAULT_LIVE_GATE) {
  const traded = (stats.total_trades ?? 0) > 0
  const criteria: PathCriterion[] = [
    { label: `Facteur de profit ≥ ${fr(gate.minPf)}`, value: stats.profit_factor ?? 0, target: gate.minPf, direction: 'gte', measurable: traded, met: traded && (stats.profit_factor ?? 0) >= gate.minPf, format: 'ratio' },
    { label: `Taux de gain ≥ ${Math.round(gate.minWinRate * 100)} %`, value: stats.win_rate ?? 0, target: gate.minWinRate, direction: 'gte', measurable: traded, met: traded && (stats.win_rate ?? 0) >= gate.minWinRate, format: 'pct' },
    { label: `Trades ≥ ${gate.minTrades}`, value: stats.total_trades ?? 0, target: gate.minTrades, direction: 'gte', measurable: true, met: (stats.total_trades ?? 0) >= gate.minTrades, format: 'count' },
    { label: `Drawdown ≤ ${Math.round(gate.maxDrawdown * 100)} %`, value: stats.max_drawdown ?? 0, target: gate.maxDrawdown, direction: 'lte', measurable: traded, met: traded && (stats.max_drawdown ?? 0) <= gate.maxDrawdown, format: 'pct' },
  ]
  const met = criteria.filter(c => c.met).length
  return { criteria, met, allMet: met === criteria.length }
}
