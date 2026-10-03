// Refonte « Le registre des décisions », lot 3: the verdict panel under the title of a
// bot fiche picks ONE state from the data the fiche already has (audit 2026-10,
// constats 3 and 6). These tests pin the choice and the copy rules.
import { describe, it, expect } from 'vitest'
import { botVerdict, firstSentence, latestDecision, limitsSentence, reviewLine } from '@/lib/bot-verdict'
import { getBotExpectations, type BotExpectations } from '@/lib/bot-expectations'

const exp: BotExpectations = {
  source: 'gate test',
  registeredAt: '2026-05-08',
  pfFloor: 1.2,
  maxDrawdown: 0.15,
  killCriteria: ['Hors enveloppe → bot gelé.'],
}

const stats = (total_trades: number, max_drawdown: number, profit_factor: number) =>
  ({ total_trades, max_drawdown, profit_factor })

describe('botVerdict picks the state', () => {
  it('in the limits: both limits named, nothing coloured', () => {
    const v = botVerdict({ status: 'live', stats: stats(42, 0.022, 2.82), expectations: exp })
    expect(v.state).toBe('ok')
    expect(v.title).toBe('Dans les limites attendues')
    expect(v.tone).toBe('neutral')
    expect(v.finding).toBe('Ce bot reste dans les limites de baisse et de rentabilité que j’avais publiées.')
    expect(v.limits?.replace(/ /g, ' ')).toBe('Limites publiées le 8 mai 2026 : pire baisse au plus 15 %, facteur de profit au moins 1,2 à partir de 20 trades.')
  })

  it('rule crossed: the owner’s sentence, in the third person, never « je dépasse »', () => {
    const v = botVerdict({ status: 'live', stats: stats(284, 0.291, 0.99), expectations: exp })
    expect(v.state).toBe('breach')
    expect(v.title).toBe('Règle d’arrêt franchie')
    expect(v.tone).toBe('loss')
    expect(v.finding).toBe('Ce bot dépasse les limites de baisse et de rentabilité que j’avais publiées.')
    expect(v.finding).not.toMatch(/je dépasse/i)
  })

  it('rule crossed on one limit only names that one', () => {
    const v = botVerdict({ status: 'live', stats: stats(40, 0.3, 1.5), expectations: exp })
    expect(v.finding).toBe('Ce bot dépasse la limite de baisse que j’avais publiée.')
  })

  it('rule crossed with a decision: the latest one, quoted, and its review date', () => {
    const decided: BotExpectations = {
      ...exp,
      decisions: [
        { rule: exp.killCriteria[0], date: '2026-09-19', status: 'pending', scope: 'x', text: 'En suspens. Rien de décidé.', reviewBy: '2026-09-22' },
        { rule: exp.killCriteria[0], date: '2026-09-25', status: 'kept', scope: 'x', text: 'Le 25 septembre, je le garde. Je n’ai pas de motif chiffré.', reviewBy: '2026-10-22' },
      ],
    }
    const v = botVerdict({ status: 'live', stats: stats(284, 0.291, 0.99), expectations: decided, today: '2026-10-02' })
    expect(v.decision?.date).toBe('2026-09-25')
    expect(v.decisionLead).toBe('Le 25 septembre, je le garde.')
    expect(v.review).toEqual({ text: 'Réexamen le 22 oct. 2026.', overdue: false })
  })

  it('rule crossed without a decision: no decision invented', () => {
    const v = botVerdict({ status: 'live', stats: stats(284, 0.291, 0.99), expectations: exp })
    expect(v.decision).toBeNull()
    expect(v.decisionLead).toBeNull()
    expect(v.review).toBeNull()
  })

  it('near the limits: watch, in the reserve tone', () => {
    const v = botVerdict({ status: 'paper', stats: stats(40, 0.14, 1.5), expectations: exp })
    expect(v.state).toBe('watch')
    expect(v.tone).toBe('warn')
    expect(v.finding).toBe('Ce bot approche de la limite de baisse que j’avais publiée, sans la dépasser.')
  })

  it('limits not defined: a bot without a published envelope', () => {
    const v = botVerdict({ status: 'live', stats: stats(69, 0.08, 1.6), expectations: null })
    expect(v.state).toBe('no-limits')
    expect(v.title).toBe('Limites non définies')
    expect(v.limits).toBeNull()
  })

  it('zero trade: insufficient data, the waiting sentence, before anything else', () => {
    for (const expectations of [exp, null]) {
      const v = botVerdict({ status: 'paper', stats: stats(0, 0, 0), expectations })
      expect(v.state).toBe('no-trade')
      expect(v.title).toBe('Données insuffisantes')
      // Refonte finition (2026-10-02): insufficient data takes the reserve ink (was neutral).
      expect(v.tone).toBe('reserve')
      expect(v.finding).toMatch(/il attend son signal/)
    }
  })

  it('zero trade carries the dormancy note once, in the panel', () => {
    const v = botVerdict({ status: 'paper', stats: stats(0, 0, 0), expectations: { ...exp, dormancyNote: 'Signaux rares.' } })
    expect(v.finding.match(/Signaux rares\./g)).toHaveLength(1)
  })

  it('a small sample is insufficient data, not a verdict', () => {
    const v = botVerdict({ status: 'paper', stats: stats(7, 0.02, 3), expectations: exp })
    expect(v.state).toBe('insufficient')
    expect(v.tone).toBe('reserve')
    expect(v.finding).toMatch(/7 trades/)
  })

  it('stopped wins over everything, with its date', () => {
    const v = botVerdict({ status: 'archived', archivedAt: '2026-08-01T10:00:00Z', stats: stats(284, 0.291, 0.99), expectations: exp })
    expect(v.state).toBe('stopped')
    expect(v.title).toBe('Arrêté')
    expect(v.finding).toMatch(/depuis le 1 août 2026|depuis le 1er août 2026/)
  })
})

describe('the real ORB decision is quoted, not rewritten', () => {
  it('cuts the first sentence from the published text', () => {
    const orb = getBotExpectations('orb-bf25')!
    const d = latestDecision(orb)!
    expect(d.text.startsWith(firstSentence(d.text))).toBe(true)
    expect(firstSentence(d.text)).toBe('Le 25 septembre, je le garde.')
  })
})

describe('helpers', () => {
  it('firstSentence keeps a one-sentence text whole', () => {
    expect(firstSentence('Je le garde')).toBe('Je le garde')
    expect(firstSentence('Je le garde. Point.')).toBe('Je le garde.')
  })

  it('reviewLine says when a review date has passed', () => {
    expect(reviewLine('2026-09-22', '2026-09-25')).toEqual({ text: 'Réexamen dépassé depuis 3 jours.', overdue: true })
    expect(reviewLine('2026-09-22', '2026-09-22')).toEqual({ text: 'Réexamen le 22 sept. 2026.', overdue: false })
  })

  it('limitsSentence is null without a registered number', () => {
    expect(limitsSentence({ ...exp, pfFloor: undefined, maxDrawdown: undefined })).toBeNull()
  })
})
