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
