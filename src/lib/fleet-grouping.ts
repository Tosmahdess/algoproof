// src/lib/fleet-grouping.ts
// « 240 bots » reads as spam; « 14 strategies, 240 incarnations » reads as
// science. The register groups so a visitor scans a dozen groups instead of
// hundreds of rows.
//
// Keyed on the `strategy` string, which every bot already carries.
//
// FIX (final whole-branch review, I8): this used to promise that once plan 3
// brought the strategy library onto this domain, "the key becomes the fiche
// slug and the label the fiche title — a change confined to this file". Plan 3
// landed and this file was not touched, so the promise was stale in both
// directions: nothing changed here, and nothing needed to. The key stays the
// strategy string (it is what the fleet actually carries, and 13 fiches have
// no alias for it yet), and the LABEL stays the operator's own wording rather
// than the library's display title — « EMA Cross H4 » is what the bot is
// called, « EMA Cross » is what the concept page is called, and flattening one
// into the other would lose information the register exists to show.
//
// What was actually missing was the link. FleetRegister now resolves each
// group label through conceptSlugForStrategy (src/lib/incarnations.ts) and
// renders the header as a link to the concept page when a fiche claims it,
// plain text when none does. Joining is a rendering concern, not a grouping
// one, which is why it lives there and not here.

export interface GroupableBot {
  strategy: string
  status: string
}

export interface StrategyGroup<T> {
  key: string
  label: string
  bots: T[]
  promotedCount: number
}

const UNGROUPED_KEY = '__ungrouped__'
const UNGROUPED_LABEL = 'Non classées'

function keyOf(strategy: string): string {
  const norm = strategy.trim().toLowerCase().replace(/\s+/g, ' ')
  return norm.length > 0 ? norm : UNGROUPED_KEY
}

export function groupByStrategy<T extends GroupableBot>(bots: T[]): StrategyGroup<T>[] {
  const map = new Map<string, StrategyGroup<T>>()

  for (const bot of bots) {
    const key = keyOf(bot.strategy)
    let group = map.get(key)
    if (!group) {
      group = {
        key,
        label: key === UNGROUPED_KEY ? UNGROUPED_LABEL : bot.strategy.trim(),
        bots: [],
        promotedCount: 0,
      }
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
