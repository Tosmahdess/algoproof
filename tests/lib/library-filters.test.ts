import { describe, it, expect } from 'vitest'
import {
  EMPTY_LIBRARY_FILTERS, LIBRARY_PAGE, parseLibraryFilters, serializeLibraryFilters,
  applyLibraryFilters, libraryOptionCounts, activeLibraryFilterCount, LIBRARY_SORT_LINE,
  defaultLibrarySort, solidSortNote, RANKED_IDEAS_FOR_DEFAULT,
  type LibraryFilterState,
} from '@/lib/library-filters'
import type { LibraryIdea } from '@/lib/library'

// The library index keeps its search, its filters, its order and how far the
// reader went in the URL (refonte « registre », page bibliothèque, 2026-10-03), so a
// shared link opens on the same list and the way back lands where it left.

type Row = LibraryIdea & { label: string; familyLabel: string }

const idea = (over: Partial<Row>): Row => ({
  idea_key: 'DonchianBreakout|H4', base: 'DonchianBreakout', tf: 'H4', family: 'breakout',
  label: 'Cassure de Donchian', familyLabel: 'Cassure',
  n_variants: 10, n_backtest: 8, n_awaiting: 6, n_trailing: 2, n_not_surviving: 0,
  n_running: 2, n_live: 0, n_paper: 2, n_stopped: 0, n_sim_up: 0, n_sim_down: 0, n_sim_young: 2,
  pf_q1: 1.1, pf_median: 1.2, pf_q3: 1.35, n_pf: 8, last_found_at: '2026-09-20T00:00:00Z',
  ...over,
})

const IDEAS: Row[] = [
  idea({ idea_key: 'A|H4', base: 'A', label: 'Canal ATR', tf: 'H4', family: 'breakout', familyLabel: 'Cassure', n_variants: 5 }),
  idea({ idea_key: 'B|D1', base: 'B', label: 'RSI 2 périodes', tf: 'D1', family: 'mean-reversion', familyLabel: 'Retour à la moyenne', n_variants: 50, n_running: 1 }),
  idea({ idea_key: 'C|D1', base: 'C', label: 'Écart à la moyenne', tf: 'D1', family: 'mean-reversion', familyLabel: 'Retour à la moyenne', n_variants: 7, n_running: 0, n_paper: 0, n_backtest: 7 }),
  idea({ idea_key: 'D|H1', base: 'D', label: 'Ouverture', tf: 'H1', family: 'breakout', familyLabel: 'Cassure', n_variants: 3, n_running: 3, n_paper: 3, n_backtest: 0 }),
]

const state = (over: Partial<LibraryFilterState>): LibraryFilterState => ({ ...EMPTY_LIBRARY_FILTERS, ...over })

describe('library URL state', () => {
  it('an empty URL is the default list: every idea, most variants first, one page', () => {
    expect(parseLibraryFilters(new URLSearchParams(''))).toEqual(EMPTY_LIBRARY_FILTERS)
    expect(EMPTY_LIBRARY_FILTERS.sort).toBe('size')
    expect(EMPTY_LIBRARY_FILTERS.shown).toBe(LIBRARY_PAGE)
    expect(serializeLibraryFilters(EMPTY_LIBRARY_FILTERS).toString()).toBe('')
  })

  it('round-trips search, horizon, type, state, order and how many rows were shown', () => {
    const s = state({ q: 'rsi', tf: 'D1', family: 'mean-reversion', state: 'backtest', sort: 'az', shown: LIBRARY_PAGE * 2 })
    const sp = serializeLibraryFilters(s)
    expect(sp.toString()).toBe(`q=rsi&tf=D1&family=mean-reversion&state=backtest&sort=az&n=${LIBRARY_PAGE * 2}`)
    expect(parseLibraryFilters(sp)).toEqual(s)
  })

  it('drops what it cannot read instead of guessing', () => {
    const s = parseLibraryFilters(new URLSearchParams('state=nope&sort=best&n=-4&tf=h4'))
    expect(s.state).toBe('')
    expect(s.sort).toBe('size')
    expect(s.shown).toBe(LIBRARY_PAGE)
    expect(s.tf).toBe('H4')
  })

  it('never writes a page count under one page, nor an odd one', () => {
    expect(parseLibraryFilters(new URLSearchParams('n=7')).shown).toBe(LIBRARY_PAGE)
    expect(parseLibraryFilters(new URLSearchParams(`n=${LIBRARY_PAGE + 3}`)).shown).toBe(LIBRARY_PAGE * 2)
    expect(serializeLibraryFilters(state({ shown: LIBRARY_PAGE })).has('n')).toBe(false)
  })
})

describe('library filters', () => {
  it('searches the French name, the engine key, the horizon and the type, accents ignored', () => {
    expect(applyLibraryFilters(IDEAS, state({ q: 'ecart' })).map(i => i.base)).toEqual(['C'])
    expect(applyLibraryFilters(IDEAS, state({ q: 'retour d1' })).map(i => i.base)).toEqual(['B', 'C'])
    expect(applyLibraryFilters(IDEAS, state({ q: 'atr' })).map(i => i.base)).toEqual(['A'])
  })

  it('filters by horizon, type and state', () => {
    expect(applyLibraryFilters(IDEAS, state({ tf: 'D1' })).map(i => i.base)).toEqual(['B', 'C'])
    expect(applyLibraryFilters(IDEAS, state({ family: 'breakout' })).map(i => i.base)).toEqual(['A', 'D'])
    expect(applyLibraryFilters(IDEAS, state({ state: 'running' })).map(i => i.base)).toEqual(['B', 'A', 'D'])
    expect(applyLibraryFilters(IDEAS, state({ state: 'backtest' })).map(i => i.base)).toEqual(['C'])
  })

  it('keeps « Plus de variantes » as the default order (D085), and offers the launched ones first', () => {
    expect(applyLibraryFilters(IDEAS, EMPTY_LIBRARY_FILTERS).map(i => i.base)).toEqual(['B', 'C', 'A', 'D'])
    expect(applyLibraryFilters(IDEAS, state({ sort: 'running' })).map(i => i.base)).toEqual(['D', 'A', 'B', 'C'])
  })

  it('counts the search and the sort as no filter', () => {
    expect(activeLibraryFilterCount(state({ q: 'rsi', sort: 'az' }))).toBe(0)
    expect(activeLibraryFilterCount(state({ tf: 'D1', state: 'running' }))).toBe(2)
  })

  it('counts each option against the other facets, so an enabled option never empties the list', () => {
    const c = libraryOptionCounts(IDEAS, state({ tf: 'D1' }))
    expect(c.tf).toEqual({ D1: 2, H1: 1, H4: 1 })
    expect(c.family).toEqual({ 'mean-reversion': 2 })
    expect(c.state).toEqual({ running: 1, backtest: 1 })
  })

  it('names the order in force with the words of the page', () => {
    expect(LIBRARY_SORT_LINE.size).toMatch(/nombre de variantes/)
    expect(LIBRARY_SORT_LINE.running).toMatch(/lancées/)
  })
})

// Lot 2c: « Les plus solides en simulation » ranks ideas on their prudent gain (90 % lower
// bound over entry days, src/lib/library-score.ts). It becomes the DEFAULT order by itself
// once 10 ideas are ranked; until then the default stays « Plus de variantes », and an
// explicit order in the URL always wins.
describe('library sort « solides » and the automatic default', () => {
  const sc = (days: number, prudent: number | null) =>
    ({ days, trades: days, mean: prudent, prudent, ranked: prudent !== null })
  const scored: Row[] = [
    idea({ idea_key: 'A|H4', base: 'A', n_variants: 5, score: sc(12, null) }),
    idea({ idea_key: 'B|D1', base: 'B', n_variants: 50, score: sc(31, -0.4) }),
    idea({ idea_key: 'C|D1', base: 'C', n_variants: 7, score: sc(40, 2.1) }),
    idea({ idea_key: 'D|H1', base: 'D', n_variants: 3, score: null }),
    idea({ idea_key: 'E|H1', base: 'E', n_variants: 4, score: sc(20, null) }),
  ]

  it('puts ranked ideas first by prudent gain, then the others by entry days observed', () => {
    expect(applyLibraryFilters(scored, state({ sort: 'solid' })).map(i => i.base)).toEqual(['C', 'B', 'E', 'A', 'D'])
  })

  it('stays on « Plus de variantes » until 10 ideas are ranked', () => {
    expect(defaultLibrarySort(scored)).toBe('size')
    const ten = Array.from({ length: 10 }, (_, k) => idea({ idea_key: `K${k}|D1`, base: `K${k}`, score: sc(30, 1) }))
    expect(defaultLibrarySort([scored[0], ...ten.slice(0, 9)])).toBe('size')            // 9 ranked
    expect(defaultLibrarySort(ten)).toBe('solid')
    expect(RANKED_IDEAS_FOR_DEFAULT).toBe(10)
  })

  it('reads and writes the URL against the default in force', () => {
    expect(parseLibraryFilters(new URLSearchParams(''), 'solid').sort).toBe('solid')
    expect(parseLibraryFilters(new URLSearchParams('sort=size'), 'solid').sort).toBe('size')
    expect(serializeLibraryFilters(state({ sort: 'solid' }), 'solid').toString()).toBe('')
    expect(serializeLibraryFilters(state({ sort: 'size' }), 'solid').toString()).toBe('sort=size')
    expect(serializeLibraryFilters(state({ sort: 'solid' })).toString()).toBe('sort=solid')
  })

  it('says when no ranked idea has a positive prudent gain yet', () => {
    expect(solidSortNote(scored)).toBe(null)
    expect(solidSortNote(scored.filter(i => i.base !== 'C'))).toMatch(/aucune idée classée n’a encore un gain prudent positif/)
    expect(solidSortNote(scored.filter(i => !i.score?.ranked))).toMatch(/aucune idée n’a encore 30 journées/)
    expect(LIBRARY_SORT_LINE.solid).toMatch(/gain prudent/)
  })
})

// Lot 2: « Les plus gardées », ideas by how many readers keep them (the lab's definer
// function library_idea_star_counts, merged by the page as `kept`). A sort, not a
// leaderboard: the counts are never printed; ties fall back to size.
describe('library sort « Les plus gardées »', () => {
  it('orders by readers who keep the idea, then by variants', () => {
    const rows = [idea({ idea_key: 'A|H4', base: 'A', n_variants: 5, kept: 2 }),
      idea({ idea_key: 'B|D1', base: 'B', n_variants: 50, kept: 0 }),
      idea({ idea_key: 'C|D1', base: 'C', n_variants: 7, kept: 2 }),
      idea({ idea_key: 'D|H1', base: 'D', n_variants: 3 })]
    expect(applyLibraryFilters(rows, state({ sort: 'kept' })).map(i => i.base)).toEqual(['C', 'A', 'B', 'D'])
    expect(parseLibraryFilters(new URLSearchParams('sort=kept')).sort).toBe('kept')
    expect(LIBRARY_SORT_LINE.kept).toMatch(/gardent en favori/)
  })
})
