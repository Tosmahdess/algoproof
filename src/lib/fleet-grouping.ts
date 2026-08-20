// src/lib/fleet-grouping.ts
// « 240 bots » reads as spam; « 14 strategies, 240 incarnations » reads as
// science. The register groups so a visitor scans a dozen groups instead of
// hundreds of rows.
//
// Keyed on the FICHE SLUG (src/lib/strategy-keys.ts), labelled with the fiche
// title. This file used to key on the `strategy` string, "which every bot
// already carries" — and every bot carries a DIFFERENT one, because production
// `strategy` is a per-deployment display sentence with the timeframe and the
// asset count baked in. The register therefore rendered 27 groups of one bot:
// one header per row, the exact opposite of what grouping is for. The eight
// deployed EMA Cross incarnations are one group again.
//
// A bot no fiche claims keeps its own `strategy` string as key and label, so
// nothing disappears from the register — a grid bot or a delta-neutral carry bot
// is still listed, under its own wording, just without a concept page behind it.
// That is also why the label is the fiche TITLE only when a fiche exists: for
// everything else the operator's own sentence is the most informative thing
// available.
import { ficheSlugForBot } from './strategy-keys'
import { getStrategyFiche } from './strategy-library'
import type { FicheSlug } from './strategy-library'
import { pnlEur } from './display'
import type { BotWithStats } from './types'

export interface GroupableBot {
  slug: string
  strategy: string
  status: string
  engine_unit_key: string | null
}

export interface StrategyGroup<T> {
  key: string
  label: string
  /** The concept page this group belongs to, or null when no fiche claims it. */
  ficheSlug: FicheSlug | null
  bots: T[]
  promotedCount: number
}

const UNGROUPED_KEY = '__ungrouped__'
const UNGROUPED_LABEL = 'Non classées'

function rawKeyOf(strategy: string): string {
  const norm = strategy.trim().toLowerCase().replace(/\s+/g, ' ')
  return norm.length > 0 ? norm : UNGROUPED_KEY
}

export function groupByStrategy<T extends GroupableBot>(bots: T[]): StrategyGroup<T>[] {
  const map = new Map<string, StrategyGroup<T>>()

  for (const bot of bots) {
    const ficheSlug = ficheSlugForBot(bot)
    const key = ficheSlug ?? rawKeyOf(bot.strategy)
    let group = map.get(key)
    if (!group) {
      // getStrategyFiche cannot return null for a slug ficheSlugForBot just
      // produced (both are typed against the same 22 fiches), but the fallback
      // keeps the label defined rather than "undefined" if that ever changes.
      const label = ficheSlug
        ? getStrategyFiche(ficheSlug)?.title ?? bot.strategy.trim()
        : key === UNGROUPED_KEY ? UNGROUPED_LABEL : bot.strategy.trim()
      group = { key, label, ficheSlug, bots: [], promotedCount: 0 }
      map.set(key, group)
    }
    group.bots.push(bot)
    if (bot.status === 'live' || bot.status === 'paper') group.promotedCount += 1
  }

  return [...map.values()].sort((a, b) => {
    if (a.key === UNGROUPED_KEY) return 1
    if (b.key === UNGROUPED_KEY) return -1
    if (b.bots.length !== a.bots.length) return b.bots.length - a.bots.length
    return a.label.localeCompare(b.label, 'fr')
  })
}

// /overview (the per-timeframe rebuild) groups the fleet by timeframe instead
// of by strategy: one H4 table, one D1 table, one H1 table, rather than a
// single dense list. Canonical order first (the site's three actual production
// timeframes, most-populated first), then any other timeframe a future bot
// might carry, alphabetically, so the function never has to change just
// because a new TF shows up.
const TF_ORDER = ['H4', 'D1', 'H1']

// Shared by groupByTimeframe below AND /strategies/[concept] (which sorts a
// fiche's incarnations, not a timeframe-grouped table, but wants the SAME
// canonical order — H4, D1, H1 — rather than the alphabetical accident that
// order happens to differ from (D1, H1, H4). Exported so both call sites read
// off one source of truth instead of two copies drifting apart.
export function tfRank(tf: string): number {
  const i = TF_ORDER.indexOf(tf)
  return i === -1 ? TF_ORDER.length : i
}

/** Register row order: biggest gain first.
 *
 * Until 2026-08-20 this was (family, then name) — an alphabet, which tells a reader
 * nothing they came for and buries the best and the worst performers in the middle of
 * the table. The owner could not find a bot he knows by heart; a visitor had no chance.
 *
 * A bot that has never traded is NOT a zero gain — it is an absent measurement, and
 * ranking it alongside real results reads as a flat performance it never had. Those sort
 * to the bottom of their table as a block, by name.
 *
 * The gain is the P&L, `latest_capital - start_capital`, NOT the capital held: the fleet
 * mixes start capitals, so the biggest balance is not the biggest gain. Same figure the
 * table renders in bold (`pnlEur`, one source of truth), so the order a reader sees always
 * matches the column they are reading it from.
 */
export function byGainDesc(a: BotWithStats, z: BotWithStats): number {
  const aTraded = a.stats.total_trades > 0
  const zTraded = z.stats.total_trades > 0
  if (aTraded !== zTraded) return aTraded ? -1 : 1
  if (aTraded) {
    const diff = pnlEur(z.stats.latest_capital, z.start_capital)
      - pnlEur(a.stats.latest_capital, a.start_capital)
    if (diff !== 0) return diff
  }
  return a.name.localeCompare(z.name)
}

export interface TimeframeGroup {
  tf: string
  bots: BotWithStats[]
}

export function groupByTimeframe(bots: BotWithStats[]): TimeframeGroup[] {
  const byTf = new Map<string, BotWithStats[]>()
  for (const b of bots) {
    const list = byTf.get(b.timeframe) ?? []
    list.push(b)
    byTf.set(b.timeframe, list)
  }
  return [...byTf.entries()]
    .sort(([a], [z]) => tfRank(a) - tfRank(z) || a.localeCompare(z))
    .map(([tf, list]) => ({ tf, bots: [...list].sort(byGainDesc) }))
}
