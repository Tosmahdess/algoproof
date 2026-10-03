import { describe, it, expect } from 'vitest'
import { ledgerState } from '@/lib/fleet-ledger'
import type { BotExpectations } from '@/lib/bot-expectations'

// The « État et décision » column of the fleet register (refonte « registre »,
// lot 4). One state per row, read from the published rule when there is one.
const EXP: BotExpectations = {
  source: 'gate',
  registeredAt: '2026-06-20',
  pfFloor: 1.3,
  maxDrawdown: 0.2,
  killCriteria: ['Hors enveloppe → gelé'],
}
const stats = (total_trades: number, profit_factor = 1.5, max_drawdown = 0.05) =>
  ({ total_trades, profit_factor, max_drawdown, win_rate: 0.5, latest_capital: 1000 })

describe('ledgerState', () => {
  it('says « pas encore de trade » for a bot without a trade, never « dans les limites » (audit n° 6)', () => {
    const s = ledgerState({ status: 'live', stats: stats(0, 0, 0) }, EXP)
    expect(s).toEqual({ kind: 'untraded', label: 'Pas encore de trade', note: null })
  })

  it('reads a crossed rule and the last decision written on it', () => {
    const exp: BotExpectations = { ...EXP, decisions: [
      { rule: 'Hors enveloppe → gelé', date: '2026-09-19', status: 'pending', scope: 's', text: 't' },
      { rule: 'Hors enveloppe → gelé', date: '2026-09-25', status: 'kept', scope: 's', text: 't' },
    ] }
    const s = ledgerState({ status: 'live', stats: stats(284, 0.9, 0.12) }, exp)
    expect(s).toEqual({ kind: 'crossed', label: 'Règle d’arrêt franchie', note: 'Je le garde' })
  })

  it('says the decision is pending when none was written', () => {
    const s = ledgerState({ status: 'paper', stats: stats(40, 0.8) }, EXP)
    expect(s?.kind).toBe('crossed')
    expect(s?.note).toBe('Décision en suspens')
  })

  it('reads « dans les limites attendues » when the rule holds', () => {
    expect(ledgerState({ status: 'live', stats: stats(42, 2.8, 0.02) }, EXP))
      .toEqual({ kind: 'inside', label: 'Dans les limites attendues', note: 'Je compare le réalisé à mes critères publiés.' })
  })

  it('reads « proche des limites » on a watch', () => {
    expect(ledgerState({ status: 'paper', stats: stats(42, 1.1, 0.02) }, EXP)?.kind).toBe('watch')
  })

  it('says it is too early under 20 trades, the drawdown being fine', () => {
    expect(ledgerState({ status: 'paper', stats: stats(7, 3, 0.01) }, EXP))
      .toEqual({ kind: 'early', label: 'Trop tôt pour juger', note: 'Moins de 20 trades.' })
  })

  it('says a real-money bot has no published limits, and leaves a simulation bot without one silent', () => {
    expect(ledgerState({ status: 'live', stats: stats(69) }, null))
      .toEqual({ kind: 'none', label: 'Limites non définies', note: 'Je n’ai pas fixé de limites à l’avance.' })
    expect(ledgerState({ status: 'paper', stats: stats(69) }, null)).toBeNull()
  })
})
