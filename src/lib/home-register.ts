// Pure helpers of the home (refonte « Le registre des décisions », lot 2).
//
// The real-money register is ordered from the best result to the least good: the
// owner's decision of 02/10/2026, which replaces C7's « longest history first »
// on this page. Its state column reads the published rule (bot-expectations.ts,
// conformity.ts) and the last decision written under it; nothing is typed here.
// Pinned by tests/lib/home-register.test.ts.
import { getBotExpectations } from '@/lib/bot-expectations'
import { assessConformity } from '@/lib/conformity'
import { LOW_SAMPLE_TRADES, pnlEur } from '@/lib/display'
import { SITE_TIME_ZONE, longDate } from '@/lib/format-date'
import type { BotStats } from '@/lib/types'

interface Ranked {
  name: string
  start_capital: number
  stats: Pick<BotStats, 'total_trades' | 'latest_capital'>
}

/** Best euro result first, least good last; a bot without a trade has no result
 *  yet and goes to the end. Ties on the name, so the order never depends on the
 *  query. Returns a new array. */
export function sortByResult<T extends Ranked>(bots: readonly T[]): T[] {
  return [...bots].sort((a, b) => {
    const ea = a.stats.total_trades === 0
    const eb = b.stats.total_trades === 0
    if (ea !== eb) return ea ? 1 : -1
    const ra = pnlEur(a.stats.latest_capital, a.start_capital)
    const rb = pnlEur(b.stats.latest_capital, b.start_capital)
    if (!ea && ra !== rb) return rb - ra
    return a.name.localeCompare(b.name, 'fr')
  })
}

export type RegisterKind = 'crossed' | 'inside' | 'none' | 'insufficient'

export interface RegisterState {
  kind: RegisterKind
  /** The fact, first: « Règle d’arrêt franchie », « Dans les limites attendues »… */
  label: string
  /** What I did with it, or what the label rests on. */
  note: string
}

const DECISION_SAID: Record<'kept' | 'frozen' | 'pending', string> = {
  kept: 'Je le garde',
  frozen: 'Je le gèle',
  pending: 'Décision en suspens',
}

/** The « État et décision » cell of one real-money bot. */
export function registerState(bot: { slug: string; stats: BotStats }): RegisterState {
  if (bot.stats.total_trades === 0) {
    return { kind: 'insufficient', label: 'Données insuffisantes', note: 'Aucun trade clos à ce jour.' }
  }
  const exp = getBotExpectations(bot.slug)
  if (!exp) {
    return { kind: 'none', label: 'Limites non définies', note: 'Je n’ai pas fixé de limites à l’avance.' }
  }
  const { status } = assessConformity(exp, bot.stats)
  if (status === 'breach') {
    const decision = exp.decisions?.filter(d => exp.killCriteria.includes(d.rule)).at(-1)
    return {
      kind: 'crossed',
      label: 'Règle d’arrêt franchie',
      note: decision ? DECISION_SAID[decision.status] : 'Je n’ai publié aucune décision.',
    }
  }
  if (status === 'insufficient') {
    return {
      kind: 'insufficient',
      label: 'Données insuffisantes',
      note: `Moins de ${LOW_SAMPLE_TRADES} trades : je ne conclus pas encore.`,
    }
  }
  return { kind: 'inside', label: 'Dans les limites attendues', note: 'Je compare le réalisé à mes critères publiés.' }
}

/** The bot's name without its venue, and the venue for the line under it:
 *  « Croisement EMA H4 Kraken Spot » reads « Croisement EMA H4 » over « Kraken Spot ». */
export function splitMarket(name: string, exchange: string): { title: string; market: string } {
  const suffix = ` ${exchange}`
  const title = exchange && name.endsWith(suffix) ? name.slice(0, -suffix.length).trim() : name
  return { title: title || name, market: exchange }
}

const parisYear = (d: Date) => Number(d.toLocaleDateString('fr-FR', { timeZone: SITE_TIME_ZONE, year: 'numeric' }))

/** « depuis le 17 avril » from bots.live_since (Paris day), with the year only when
 *  it is not the year of the reading; « depuis le départ » without a date. */
export function sinceLabel(liveSince: string | null | undefined, now: Date = new Date()): string {
  const t = liveSince ? Date.parse(liveSince) : Number.NaN
  if (!Number.isFinite(t)) return 'depuis le départ'
  const d = new Date(t)
  const full = longDate(d)
  const sameYear = parisYear(d) === parisYear(now)
  return `depuis le ${sameYear ? full.replace(/\s\d{4}$/, '') : full}`
}

/** The day of the freshest sync, « 2 octobre 2026 », or null when none parses. */
export function readingDate(dates: readonly (string | null | undefined)[]): string | null {
  const times = dates.map(d => (d ? Date.parse(d) : Number.NaN)).filter(t => Number.isFinite(t))
  if (times.length === 0) return null
  return longDate(Math.max(...times))
}

/** The first sentence of a summary: up to the first . ! or ? followed by a space. */
export function firstSentence(text: string): string {
  const m = text.match(/^.*?[.!?](?=\s|$)/)
  return (m ? m[0] : text).trim()
}

interface IdeaCounts {
  n_variants: number
  n_live: number
  n_paper: number
  n_backtest: number
}

/** The library's totals, summed the way /bibliotheque sums them. */
export function librarySummary(ideas: readonly IdeaCounts[]) {
  return {
    ideas: ideas.length,
    variants: ideas.reduce((n, i) => n + i.n_variants, 0),
    live: ideas.reduce((n, i) => n + i.n_live, 0),
    paper: ideas.reduce((n, i) => n + i.n_paper, 0),
    waiting: ideas.reduce((n, i) => n + i.n_backtest, 0),
  }
}
