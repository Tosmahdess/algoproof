// src/lib/library-filters.ts
//
// The library index's state, in the URL (refonte « registre », page bibliothèque,
// 2026-10-03): the search, three facets, the order and how many rows the reader
// opened. Parsed on the server (the page reads searchParams, so a shared link renders
// its filtered list on first paint), written back with replaceState by the client.
//
// The keys are the fleet's where they mean the same thing (tf, family, sort), so the
// two registers speak one URL grammar.
import { sortIdeas, type IdeaSort, type LibraryIdea } from './library'

/** Rows shown before « Voir les N suivantes ». */
export const LIBRARY_PAGE = 30

export type LibraryStateFilter = '' | 'running' | 'backtest'

export interface LibraryFilterState {
  q: string
  tf: string
  family: string
  state: LibraryStateFilter
  sort: IdeaSort
  /** How many rows are open, a multiple of LIBRARY_PAGE. */
  shown: number
}

export const EMPTY_LIBRARY_FILTERS: LibraryFilterState = {
  q: '', tf: '', family: '', state: '', sort: 'size', shown: LIBRARY_PAGE,
}

const SORTS: readonly IdeaSort[] = ['size', 'running', 'recent', 'az']

/** The order in force, said under the register's title. */
export const LIBRARY_SORT_LINE: Record<IdeaSort, string> = {
  size: 'par nombre de variantes, la plus fournie en tête',
  running: 'par nombre de variantes lancées, la plus fournie en tête',
  recent: 'de la plus récemment trouvée par mon moteur à la plus ancienne',
  az: 'par ordre alphabétique de leur nom de moteur',
}

/** The short names of the sorts, in the list. */
export const LIBRARY_SORT_LABEL: Record<IdeaSort, string> = {
  size: 'Plus de variantes',
  running: 'Plus de variantes lancées',
  recent: 'Récentes',
  az: 'A-Z',
}
export const LIBRARY_SORTS = SORTS

const PARAM_ORDER = ['q', 'tf', 'family', 'state', 'sort', 'n'] as const

function pages(n: number): number {
  return Math.max(1, Math.ceil(n / LIBRARY_PAGE)) * LIBRARY_PAGE
}

export function parseLibraryFilters(sp: URLSearchParams): LibraryFilterState {
  const state = sp.get('state')
  const sort = sp.get('sort')
  const n = Number(sp.get('n'))
  return {
    q: (sp.get('q') ?? '').trim().slice(0, 80),
    tf: (sp.get('tf') ?? '').trim().toUpperCase(),
    family: (sp.get('family') ?? '').trim(),
    state: state === 'running' || state === 'backtest' ? state : '',
    sort: (SORTS as readonly string[]).includes(sort ?? '') ? (sort as IdeaSort) : EMPTY_LIBRARY_FILTERS.sort,
    shown: Number.isFinite(n) && n > LIBRARY_PAGE ? pages(n) : LIBRARY_PAGE,
  }
}

export function serializeLibraryFilters(s: LibraryFilterState): URLSearchParams {
  const values: Record<(typeof PARAM_ORDER)[number], string> = {
    q: s.q.trim(),
    tf: s.tf,
    family: s.family,
    state: s.state,
    sort: s.sort === EMPTY_LIBRARY_FILTERS.sort ? '' : s.sort,
    n: s.shown > LIBRARY_PAGE ? String(pages(s.shown)) : '',
  }
  const sp = new URLSearchParams()
  for (const key of PARAM_ORDER) if (values[key]) sp.set(key, values[key])
  return sp
}

/** The facets that narrow the list: neither the search (it has its own clear
 *  button) nor the order. */
export function activeLibraryFilterCount(s: LibraryFilterState): number {
  return [s.tf, s.family, s.state].filter(Boolean).length
}

type Searchable = LibraryIdea & { label: string; familyLabel: string }

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function matches(i: Searchable, s: Omit<LibraryFilterState, 'sort' | 'shown'>): boolean {
  const words = norm(s.q).split(/\s+/).filter(Boolean)
  return (!s.tf || i.tf === s.tf)
    && (!s.family || i.family === s.family)
    && (!s.state || (s.state === 'running' ? i.n_running > 0 : i.n_backtest === i.n_variants))
    && words.every(w => norm(`${i.label} ${i.base} ${i.tf} ${i.familyLabel}`).includes(w))
}

export function applyLibraryFilters<T extends Searchable>(ideas: T[], s: LibraryFilterState): T[] {
  return sortIdeas(ideas.filter(i => matches(i, s)), s.sort)
}

export interface LibraryOptionCounts {
  tf: Record<string, number>
  family: Record<string, number>
  state: Record<'running' | 'backtest', number>
}

/** Each option counted against the OTHER facets and the search, so an enabled
 *  option never empties the list (the fleet's rule, audit 2026-10 n° 75). */
export function libraryOptionCounts<T extends Searchable>(ideas: T[], s: LibraryFilterState): LibraryOptionCounts {
  const out: LibraryOptionCounts = { tf: {}, family: {}, state: { running: 0, backtest: 0 } }
  for (const i of ideas) {
    if (matches(i, { ...s, tf: '' })) out.tf[i.tf] = (out.tf[i.tf] ?? 0) + 1
    if (matches(i, { ...s, family: '' })) out.family[i.family] = (out.family[i.family] ?? 0) + 1
    if (matches(i, { ...s, state: '' })) {
      if (i.n_running > 0) out.state.running += 1
      if (i.n_backtest === i.n_variants) out.state.backtest += 1
    }
  }
  return out
}
