// src/lib/bot-filters.ts
// Filter state for « La flotte », as pure data. No React, no router, no DOM.
//
// Two rules drive the design:
//   1. State lives in the URL so it survives sharing and the back button. It is
//      NOT there for SEO — Google's faceted-navigation guidance asks that facet
//      URLs not be crawled. That disallow rule is LIVE as of Plan 3 Task 5:
//      src/app/robots.ts disallows the family/status/asset/tf/sort parameter
//      space (plus the retired `venue` parameter — the facet was removed
//      2026-08-08, but shared URLs carrying it still exist in the wild, so the
//      disallow line stays). Parameter order is constant anyway because that
//      guidance requires it of any facet URL that does get crawled, and
//      because it makes the round-trip test meaningful.
//   2. Anything unknown in the URL is dropped, never trusted. A stale link with
//      a family that no longer exists renders the default view, not a crash.
import { FAMILY_ORDER, isFamily, familyLabel, type Family } from './families'
import { toBaseAsset } from './asset'

export type FleetStatusFilter = 'live' | 'paper' | 'archived'
export type SortKey = 'proven' | 'trades' | 'win_rate' | 'profit_factor' | 'max_drawdown' | 'pnl'
export type SortDir = 'asc' | 'desc'
// FIX (final review, I5): `direction` / `DirectionFilterValue` /
// `isDirectionNarrowed` and the `dir_trade` URL parameter used to live here,
// under a doc comment claiming the switch "recomputes the displayed stats
// through computeBotStats(..., direction, ...)" and that "the filter bar
// mentions it separately so a non-default direction is never silently applied".
// Neither was true: FleetRegister never called computeBotStats, the bar renders
// only family and venue pills, and isDirectionNarrowed had no caller —
// ?dir_trade=long round-tripped through the URL and changed nothing on screen.
// A comment asserting a safety property the code does not have is worse than no
// comment. It comes back with the UI that uses it.

const STATUS_VALUES: readonly FleetStatusFilter[] = ['live', 'paper', 'archived']
const SORT_VALUES: readonly SortKey[] = ['proven', 'trades', 'win_rate', 'profit_factor', 'max_drawdown', 'pnl']

export interface FleetFilterState {
  family: Family[]
  status: FleetStatusFilter[]
  asset: string[]
  timeframe: string[]
  sort: SortKey
  dir: SortDir
}

/** The default view: no filter, and the only sort that is not a performance ranking. */
export const EMPTY_FILTERS: FleetFilterState = {
  family: [], status: [], asset: [], timeframe: [],
  sort: 'proven', dir: 'desc',
}

export interface FilterableBot {
  family: Family
  status: string
  assets: string[]
  timeframe: string
}

// Parameter order is fixed here and nowhere else. Exported (fix round 1) so
// tests/lib/robots-facets.test.ts can assert every entry here has a matching
// /*?<name>= line in robots.ts's disallow list — adding a facet must not be
// able to outrun the disallow list silently.
export const PARAM_ORDER = ['family', 'status', 'asset', 'tf', 'sort', 'dir'] as const

function readList(sp: URLSearchParams, key: string): string[] {
  const raw = sp.get(key)
  if (!raw) return []
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

export function parseFleetFilters(sp: URLSearchParams): FleetFilterState {
  const sort = sp.get('sort')
  const dir = sp.get('dir')
  return {
    family: readList(sp, 'family').filter(isFamily),
    status: readList(sp, 'status').filter((s): s is FleetStatusFilter =>
      (STATUS_VALUES as readonly string[]).includes(s)),
    asset: readList(sp, 'asset').map(a => a.toUpperCase()),
    timeframe: readList(sp, 'tf').map(t => t.toUpperCase()),
    sort: (SORT_VALUES as readonly string[]).includes(sort ?? '') ? (sort as SortKey) : 'proven',
    dir: dir === 'asc' ? 'asc' : 'desc',
  }
}

export function serializeFleetFilters(s: FleetFilterState): URLSearchParams {
  const values: Record<(typeof PARAM_ORDER)[number], string> = {
    family: s.family.join(','),
    status: s.status.join(','),
    asset: s.asset.join(','),
    tf: s.timeframe.join(','),
    sort: s.sort === EMPTY_FILTERS.sort ? '' : s.sort,
    dir: s.dir === EMPTY_FILTERS.dir ? '' : s.dir,
  }
  const sp = new URLSearchParams()
  for (const key of PARAM_ORDER) {
    if (values[key]) sp.set(key, values[key])
  }
  return sp
}

function matchesStatus(bot: FilterableBot, selected: FleetStatusFilter[]): boolean {
  if (selected.length === 0) return true
  const bucket: FleetStatusFilter =
    bot.status === 'live' ? 'live' : bot.status === 'archived' ? 'archived' : 'paper'
  return selected.includes(bucket)
}

function matchesAsset(bot: FilterableBot, selected: string[]): boolean {
  if (selected.length === 0) return true
  // Exact match on the normalised base asset, never containment: `includes`
  // makes BTC swallow WBTC and BTCB, so the count next to the option and the
  // rows below it would both be wrong while every parser test stayed green.
  // `selected` is normalised here too (not just in parseFleetFilters) because
  // applyFleetFilters is a public entry point in its own right: callers that
  // build FleetFilterState directly (tests, future callers) must not silently
  // get case-sensitive matching just because they bypassed the URL parser.
  const wanted = selected.map(v => v.toUpperCase())
  return bot.assets.some(a => wanted.includes(toBaseAsset(a)))
}

/** Each predicate is exported-by-shape so optionCounts can leave one facet out. */
const PREDICATES = {
  family: (b: FilterableBot, s: FleetFilterState) => s.family.length === 0 || s.family.includes(b.family),
  status: (b: FilterableBot, s: FleetFilterState) => matchesStatus(b, s.status),
  asset: (b: FilterableBot, s: FleetFilterState) => matchesAsset(b, s.asset),
  timeframe: (b: FilterableBot, s: FleetFilterState) =>
    s.timeframe.length === 0 || s.timeframe.includes(b.timeframe.toUpperCase()),
} as const

type FacetKey = keyof typeof PREDICATES

// A `backtest` bot is an engine CANDIDATE that has never been deployed: no
// paper run, no live run, nothing a visitor should ever see. The spec is
// explicit that only deployed bots get a public page. This is a visibility
// rule, not a facet choice, so it is not a `status` branch inside PREDICATES
// (a user could otherwise select `status=paper` and, on a pristine facet,
// still see it) — it is enforced unconditionally, before any facet runs.
//
// DEFENCE IN DEPTH, not the primary enforcement. Since the final review (C3)
// the same rule is applied at the query itself — `getBots()` and
// `getBotSlugs()` in src/lib/queries.ts both carry
// `.not('status', 'in', '("frozen","backtest")')` — because this function is
// only reached by /overview's register, while /strategies and the home page
// preview never call it. Keep both: this one still guards any caller that
// builds a bot list by other means (tests, a future query, a direct fetch).
function isPubliclyVisible(bot: FilterableBot): boolean {
  return bot.status !== 'backtest'
}

export function applyFleetFilters<T extends FilterableBot>(bots: T[], s: FleetFilterState): T[] {
  return bots.filter(b =>
    isPubliclyVisible(b) && (Object.keys(PREDICATES) as FacetKey[]).every(k => PREDICATES[k](b, s)),
  )
}

function applyExcept<T extends FilterableBot>(bots: T[], s: FleetFilterState, skip: FacetKey): T[] {
  return bots.filter(b =>
    isPubliclyVisible(b) &&
    (Object.keys(PREDICATES) as FacetKey[]).filter(k => k !== skip).every(k => PREDICATES[k](b, s)),
  )
}

export interface OptionCounts {
  family: Record<string, number>
  status: Record<string, number>
  timeframe: Record<string, number>
}

/**
 * Counts shown next to each option. Each facet is counted against the OTHER
 * facets only — counting a facet against itself would drive every unselected
 * option to zero the moment one is picked, which makes multi-select unusable.
 */
export function optionCounts<T extends FilterableBot>(bots: T[], s: FleetFilterState): OptionCounts {
  const family: Record<string, number> = {}
  for (const f of FAMILY_ORDER) family[f] = 0
  for (const b of applyExcept(bots, s, 'family')) family[b.family] = (family[b.family] ?? 0) + 1

  const status: Record<string, number> = { live: 0, paper: 0, archived: 0 }
  for (const b of applyExcept(bots, s, 'status')) {
    const bucket = b.status === 'live' ? 'live' : b.status === 'archived' ? 'archived' : 'paper'
    status[bucket] += 1
  }

  const timeframe: Record<string, number> = {}
  for (const b of applyExcept(bots, s, 'timeframe')) {
    const tf = b.timeframe.toUpperCase()
    timeframe[tf] = (timeframe[tf] ?? 0) + 1
  }

  return { family, status, timeframe }
}

export function activeFilterCount(s: FleetFilterState): number {
  return s.family.length + s.status.length + s.asset.length + s.timeframe.length
}


/**
 * A zero-result view must name the filter responsible and offer its removal.
 * Returns the French sentence to show, or null while results remain.
 *
 * Facets are applied one at a time, in order, on top of the shrinking result
 * of the previous ones. The facet blamed is the first whose application on
 * that already-narrowed set is what drives the count to zero. This is not the
 * same as "the first facet that would unblock the list if removed alone":
 * with two independently-restrictive facets (e.g. family=carry AND
 * tf=M15, each matching a different single bot), removing EITHER one
 * alone reopens the list, so that check cannot tell them apart. Sequential
 * narrowing can, because it mirrors how the predicates actually combine
 * (AND across facets) and names whichever facet's constraint had no bot left
 * to apply to.
 */
export function describeEmptyResult(bots: FilterableBot[], s: FleetFilterState): string | null {
  if (applyFleetFilters(bots, s).length > 0) return null

  const facets: { key: FacetKey; describe: () => string }[] = [
    { key: 'family', describe: () => s.family.map(f => familyLabel(f)).join(', ') },
    { key: 'timeframe', describe: () => s.timeframe.join(', ') },
    { key: 'asset', describe: () => s.asset.join(', ') },
    { key: 'status', describe: () => s.status.join(', ') },
  ]

  // Start from the publicly visible set: a `backtest` candidate must never be
  // the thing "blamed" for an empty result, since it was never a candidate
  // for display in the first place (see `isPubliclyVisible`).
  let remaining = bots.filter(isPubliclyVisible)
  for (const facet of facets) {
    const next = remaining.filter(b => PREDICATES[facet.key](b, s))
    if (next.length === 0 && remaining.length > 0) {
      return `Aucun bot ne correspond. C'est le filtre « ${facet.describe()} » qui vide la liste.`
    }
    remaining = next
  }
  return 'Aucun bot ne correspond à cette combinaison de filtres.'
}
