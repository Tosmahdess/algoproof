// Conformity assessment: confront realized (paper/live) stats with the pre-registered
// backtest envelope (bot-expectations.ts). Pure and front-side: it only consumes what
// getBotWithStats already computes, no extra fetch, no sync change.
//
// Rules (see docs/plans/2026-07-02-conformity-proof.md):
// - Drawdown is capital-based → checked from trade 1, at any sample size.
//   breach above maxDrawdown × 1.25, watch above maxDrawdown × 0.8.
// - PF is only meaningful at ≥ LOW_SAMPLE_TRADES → watch below the registered floor,
//   breach below 1.0 (losing money over a real sample breaks the envelope regardless).
// - Global status = worst check; 'insufficient' when < 20 trades and nothing worse.

import type { BotExpectations } from './bot-expectations'
import { LOW_SAMPLE_TRADES } from './display'

export type CheckStatus = 'ok' | 'watch' | 'breach'
export type ConformityStatus = CheckStatus | 'insufficient'

export interface ConformityCheck {
  label: string
  expected: string
  realized: string
  status: CheckStatus
}

export interface RealizedStats {
  profit_factor: number
  max_drawdown: number
  total_trades: number
}

export interface ConformityResult {
  status: ConformityStatus
  checks: ConformityCheck[]
  narrative: string
}

const DD_BREACH_MULT = 1.25
const DD_WATCH_MULT = 0.8

function pct(x: number): string {
  return `${(x * 100).toFixed(1).replace(/\.0$/, '')} %`
}

export function assessConformity(exp: BotExpectations, stats: RealizedStats): ConformityResult {
  const checks: ConformityCheck[] = []

  if (exp.maxDrawdown !== undefined) {
    const status: CheckStatus =
      stats.max_drawdown > exp.maxDrawdown * DD_BREACH_MULT ? 'breach'
      : stats.max_drawdown > exp.maxDrawdown * DD_WATCH_MULT ? 'watch'
      : 'ok'
    checks.push({
      label: 'Drawdown max',
      expected: `≤ ${pct(exp.maxDrawdown)}`,
      realized: pct(stats.max_drawdown),
      status,
    })
  }

  if (exp.pfFloor !== undefined && stats.total_trades >= LOW_SAMPLE_TRADES) {
    const status: CheckStatus =
      stats.profit_factor < 1.0 ? 'breach'
      : stats.profit_factor < exp.pfFloor ? 'watch'
      : 'ok'
    checks.push({
      label: 'Rentabilité (profit factor)',
      expected: `≥ ${exp.pfFloor}`,
      realized: stats.profit_factor.toFixed(2),
      status,
    })
  }

  const worst: CheckStatus | null =
    checks.some(c => c.status === 'breach') ? 'breach'
    : checks.some(c => c.status === 'watch') ? 'watch'
    : checks.length > 0 ? 'ok'
    : null

  let status: ConformityStatus
  if (worst === 'breach' || worst === 'watch') status = worst
  else if (stats.total_trades < LOW_SAMPLE_TRADES) status = 'insufficient'
  else status = worst ?? 'ok'

  return { status, checks, narrative: buildNarrative(status, checks) }
}

function buildNarrative(status: ConformityStatus, checks: ConformityCheck[]): string {
  const failing = checks
    .filter(c => c.status !== 'ok')
    .map(c => `${c.label.toLowerCase()} ${c.realized} pour ${c.expected} attendu`)
    .join(' ; ')

  switch (status) {
    case 'breach':
      return `Le réalisé sort de l’enveloppe attendue (${failing}). Les critères d’arrêt publiés ci-dessous s’appliquent.`
    case 'watch':
      return `Le réalisé approche la limite de l’enveloppe (${failing}) : sous surveillance, pas de rupture à ce stade.`
    case 'insufficient':
      return `Moins de ${LOW_SAMPLE_TRADES} trades : trop tôt pour juger la conformité au backtest. Le drawdown, lui, est surveillé dès le premier trade.`
    case 'ok':
      return 'Le réalisé reste dans l’enveloppe attendue du backtest.'
  }
}
