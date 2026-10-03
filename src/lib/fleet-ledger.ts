// src/lib/fleet-ledger.ts
// The « État et décision » column of the fleet register (refonte « registre »,
// lot 4, 2026-10-02). The mock-up's home ledger has three columns, « Bot et
// marché », « État et décision », « Résultat depuis le départ »; the fleet takes
// the same grammar for every bot it lists.
//
// Computed on the SERVER (FleetOverview) and shipped as a few words per row:
// the expectations file never enters the browser bundle.
//
// The words follow the decision panel of the bot page (lot 3): « Règle d'arrêt
// franchie », « Dans les limites attendues », « Limites non définies ». A bot
// without a trade gets no verdict at all: its drawdown of 0 % is not a check
// passed (audit 2026-10, n° 6).
import type { BotExpectations } from './bot-expectations'
import { assessConformity } from './conformity'
import { LOW_SAMPLE_TRADES } from './display'
import type { FleetBot } from './types'

export type LedgerKind = 'untraded' | 'crossed' | 'watch' | 'inside' | 'early' | 'none'

export interface LedgerState {
  kind: LedgerKind
  label: string
  note: string | null
}

/** A register row: the projected bot, plus its state when it has one. */
export type LedgerBot = FleetBot & { ledger?: LedgerState | null }

interface StateInput {
  status: string
  stats: { total_trades: number; profit_factor: number; max_drawdown: number; win_rate: number; latest_capital: number }
}

const DECISION: Record<'kept' | 'frozen' | 'pending', string> = {
  kept: 'Je le garde',
  frozen: 'Je le gèle',
  pending: 'Décision en suspens',
}

/** The row's state, or null when there is nothing to say beyond the regime
 *  (a simulation bot without published limits: most of the fleet). */
export function ledgerState(bot: StateInput, exp: BotExpectations | null): LedgerState | null {
  if (bot.stats.total_trades === 0) return { kind: 'untraded', label: 'Pas encore de trade', note: null }
  if (!exp) {
    return bot.status === 'live'
      ? { kind: 'none', label: 'Limites non définies', note: 'Je n’ai pas fixé de limites à l’avance.' }
      : null
  }
  const result = assessConformity(exp, bot.stats)
  switch (result.status) {
    case 'breach': {
      const last = exp.decisions?.filter(d => exp.killCriteria.includes(d.rule)).at(-1)
      return { kind: 'crossed', label: 'Règle d’arrêt franchie', note: DECISION[last?.status ?? 'pending'] }
    }
    case 'watch':
      return { kind: 'watch', label: 'Proche des limites', note: 'Je le surveille ; il ne les a pas dépassées.' }
    case 'insufficient':
      return { kind: 'early', label: 'Trop tôt pour juger', note: `Moins de ${LOW_SAMPLE_TRADES} trades.` }
    case 'ok':
      return { kind: 'inside', label: 'Dans les limites attendues', note: 'Je compare le réalisé à mes critères publiés.' }
  }
}
