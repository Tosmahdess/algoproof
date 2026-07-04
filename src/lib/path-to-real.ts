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
}

export function evaluatePathToReal(stats: BotStats, gate: LiveGate = DEFAULT_LIVE_GATE) {
  const criteria: PathCriterion[] = [
    { label: `Profit Factor ≥ ${gate.minPf}`, value: stats.profit_factor ?? 0, target: gate.minPf, direction: 'gte', met: (stats.profit_factor ?? 0) >= gate.minPf, format: 'ratio' },
    { label: `Taux de gain ≥ ${Math.round(gate.minWinRate * 100)} %`, value: stats.win_rate ?? 0, target: gate.minWinRate, direction: 'gte', met: (stats.win_rate ?? 0) >= gate.minWinRate, format: 'pct' },
    { label: `Trades ≥ ${gate.minTrades}`, value: stats.total_trades ?? 0, target: gate.minTrades, direction: 'gte', met: (stats.total_trades ?? 0) >= gate.minTrades, format: 'count' },
    { label: `Drawdown ≤ ${Math.round(gate.maxDrawdown * 100)} %`, value: stats.max_drawdown ?? 0, target: gate.maxDrawdown, direction: 'lte', met: (stats.max_drawdown ?? 0) <= gate.maxDrawdown, format: 'pct' },
  ]
  const met = criteria.filter(c => c.met).length
  return { criteria, met, allMet: met === criteria.length }
}
