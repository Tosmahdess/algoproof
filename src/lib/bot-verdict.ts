// The verdict panel of a bot fiche (refonte « Le registre des décisions », lot 3,
// audit 2026-10 constats 3 and 6). One state per bot, chosen from the data the fiche
// already has: the bot's status, its trade count, its published limits
// (bot-expectations.ts) and the conformity check against them (conformity.ts).
//
// Pure on purpose: the panel sits under the title and is never folded, so the state it
// shows must be the same one the rules section below argues, computed once.
//
// Copy rules (owner, 02/10): the finding is about « ce bot », never « je dépasse »; the
// decision is the published text, quoted, never rewritten (bot-expectations.ts keeps it
// append-only); the review date comes from the decision itself.
import type { BotExpectations, KillDecision } from './bot-expectations'
import { assessConformity, type ConformityCheck } from './conformity'
import { LOW_SAMPLE_TRADES, NARROW_NBSP, frNumber } from './display'
import { mediumDate } from './format-date'
import type { BotStatus } from './types'

export type VerdictState =
  | 'stopped'      // arrêté
  | 'no-trade'     // données insuffisantes, zéro trade
  | 'breach'       // règle franchie
  | 'watch'        // proche des limites publiées
  | 'insufficient' // données insuffisantes, petit échantillon
  | 'ok'           // dans les limites attendues
  | 'no-limits'    // limites non définies

/** `reserve`: the reserve ink, kept for insufficient data (refonte finition, 2026-10-02). */
export type VerdictTone = 'loss' | 'warn' | 'reserve' | 'neutral'

export interface BotVerdict {
  state: VerdictState
  /** The state in a few words, the panel's heading. */
  title: string
  /** What I see, in the third person (« Ce bot… ») or in « je ». */
  finding: string
  tone: VerdictTone
  /** The last decision published under a crossed rule, verbatim. */
  decision: KillDecision | null
  /** The first sentence of that decision, cut from the published text, not rewritten. */
  decisionLead: string | null
  /** The decision's review date, or how long ago it passed. */
  review: { text: string; overdue: boolean } | null
  /** « Limites publiées le … : … », built from the registered numbers. Null without them. */
  limits: string | null
}

export interface VerdictInput {
  status: BotStatus
  archivedAt?: string | null
  stats: { total_trades: number; max_drawdown: number; profit_factor: number }
  expectations: BotExpectations | null
  /** YYYY-MM-DD, for the review guard. Defaults to the render date. */
  today?: string
}

const DAY = 86_400_000

/** Whole days the review date is behind `today` (YYYY-MM-DD); 0 on the day itself. */
export function reviewOverdueDays(reviewBy: string, today: string): number {
  return Math.max(0, Math.floor((Date.parse(today) - Date.parse(reviewBy)) / DAY))
}

/** The review line of a decision, the same words DecisionNote prints. */
export function reviewLine(reviewBy: string, today: string): { text: string; overdue: boolean } {
  const overdue = reviewOverdueDays(reviewBy, today)
  return overdue > 0
    ? { text: `Réexamen dépassé depuis ${overdue} jour${overdue > 1 ? 's' : ''}.`, overdue: true }
    : { text: `Réexamen le ${mediumDate(reviewBy)}.`, overdue: false }
}

/** The first sentence of a published text, cut at the first full stop followed by a
 *  space; the whole text when it is one sentence. Nothing is reworded. */
export function firstSentence(text: string): string {
  const m = /^(.+?[.!?])(?:\s|$)/.exec(text.trim())
  return m ? m[1] : text.trim()
}

/** The decision answering a published rule: the last one written (append-only). */
export function latestDecision(exp: BotExpectations): KillDecision | null {
  const answered = exp.decisions?.filter(d => exp.killCriteria.includes(d.rule)) ?? []
  return answered.at(-1) ?? null
}

function pct(x: number): string {
  return `${frNumber(x * 100, 1).replace(/,0$/, '')}${NARROW_NBSP}%`
}

/** « Limites publiées le 8 mai 2026 : pire baisse au plus 15 %, facteur de profit au
 *  moins 1,2 à partir de 20 trades. » From the registered numbers only. */
export function limitsSentence(exp: BotExpectations): string | null {
  const parts: string[] = []
  if (exp.maxDrawdown !== undefined) parts.push(`pire baisse au plus ${pct(exp.maxDrawdown)}`)
  if (exp.pfFloor !== undefined) {
    parts.push(`facteur de profit au moins ${String(exp.pfFloor).replace('.', ',')} à partir de ${LOW_SAMPLE_TRADES} trades`)
  }
  if (parts.length === 0) return null
  return `Limites publiées le ${mediumDate(exp.registeredAt)} : ${parts.join(', ')}.`
}

const NOUN: Record<string, string> = { 'Drawdown max': 'baisse', 'Rentabilité (facteur de profit)': 'rentabilité' }

/** « les limites de baisse et de rentabilité », « la limite de baisse »… */
function limitsOf(checks: ConformityCheck[]): { phrase: string; plural: boolean } {
  const nouns = checks.map(c => NOUN[c.label] ?? c.label.toLowerCase())
  if (nouns.length === 1) return { phrase: `la limite de ${nouns[0]}`, plural: false }
  return { phrase: `les limites de ${nouns.slice(0, -1).join(', de ')} et de ${nouns.at(-1)}`, plural: true }
}

export function botVerdict({ status, archivedAt = null, stats, expectations, today }: VerdictInput): BotVerdict {
  const day = today ?? new Date().toISOString().slice(0, 10)
  const limits = expectations ? limitsSentence(expectations) : null
  const base = { decision: null, decisionLead: null, review: null, limits }

  if (status === 'archived' || status === 'frozen') {
    const since = archivedAt ? ` depuis le ${mediumDate(archivedAt)}` : ''
    return {
      ...base, state: 'stopped', title: 'Arrêté', tone: 'neutral',
      finding: `Ce bot ne tourne plus${since}. Son historique reste publié.`,
    }
  }

  if (stats.total_trades === 0) {
    const dormancy = expectations?.dormancyNote ? ` ${expectations.dormancyNote}` : ''
    return {
      ...base, state: 'no-trade', title: 'Données insuffisantes', tone: 'reserve',
      finding: `Ce bot tourne mais il attend son signal. Il n’a encore rien tradé.${dormancy}`,
    }
  }

  if (!expectations || limits === null) {
    return {
      ...base, state: 'no-limits', title: 'Limites non définies', tone: 'neutral',
      finding: 'Je n’ai pas fixé de limites à l’avance pour ce bot.',
    }
  }

  const result = assessConformity(expectations, stats)

  if (result.status === 'breach') {
    const crossed = limitsOf(result.checks.filter(c => c.status === 'breach'))
    const decision = latestDecision(expectations)
    return {
      ...base, state: 'breach', title: 'Règle d’arrêt franchie', tone: 'loss',
      finding: `Ce bot dépasse ${crossed.phrase} que j’avais publiée${crossed.plural ? 's' : ''}.`,
      decision,
      decisionLead: decision ? firstSentence(decision.text) : null,
      review: decision?.reviewBy ? reviewLine(decision.reviewBy, day) : null,
    }
  }

  if (result.status === 'watch') {
    const near = limitsOf(result.checks.filter(c => c.status === 'watch'))
    return {
      ...base, state: 'watch', title: 'Proche des limites', tone: 'warn',
      finding: `Ce bot approche ${near.phrase.replace(/^la /, 'de la ').replace(/^les /, 'des ')} que j’avais publiée${near.plural ? 's' : ''}, sans ${near.plural ? 'les' : 'la'} dépasser.`,
    }
  }

  if (result.status === 'insufficient') {
    const n = stats.total_trades
    const dd = result.checks.some(c => c.label === 'Drawdown max')
      ? ' Sa baisse, elle, reste dans la limite publiée.' : ''
    return {
      ...base, state: 'insufficient', title: 'Données insuffisantes', tone: 'reserve',
      finding: `Ce bot n’a que ${n} trade${n > 1 ? 's' : ''} : trop tôt pour juger sa rentabilité.${dd}`,
    }
  }

  const held = limitsOf(result.checks)
  return {
    ...base, state: 'ok', title: 'Dans les limites attendues', tone: 'neutral',
    finding: `Ce bot reste dans ${held.phrase} que j’avais publiée${held.plural ? 's' : ''}.`,
  }
}
