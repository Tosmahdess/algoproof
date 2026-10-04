'use client'
// The library index as a register (refonte « registre », page bibliothèque,
// 2026-10-03). It used to be a grid of cards, each with the sketch of its family:
// the first screen showed three ideas and the same drawing three times (audit
// 2026-10, n° 41). Now one row per idea, in the fleet's grammar: the idea and its
// horizon, then how many variants it holds in each state, figures right-aligned.
// The sketch moved to the idea page, where it explains something.
//
// No PF and no curve on a row: a « representative » figure would be a pick among
// variants, made after the fact (D079), and the best idea is not ranked on a
// backtest (D085).
//
// Search, facets, order and how many rows are open live in the URL
// (src/lib/library-filters.ts), seeded from the server-parsed state, written back
// with replaceState. The empty state carries its own reset, at every width (n° 40:
// « Tout effacer » was phone-only, a desktop reader had no way out).
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import StickyFilterBar from '@/components/StickyFilterBar'
import { FavoriteStar, FavoritesProvider } from '@/components/FavoritesProvider'
import { scoreNote, simLine, type IdeaSort, type LibraryIdea } from '@/lib/library'
import {
  EMPTY_LIBRARY_FILTERS, LIBRARY_PAGE, LIBRARY_SORTS, LIBRARY_SORT_LABEL, LIBRARY_SORT_LINE,
  activeLibraryFilterCount, applyLibraryFilters, libraryOptionCounts, parseLibraryFilters,
  serializeLibraryFilters, solidSortNote, type LibraryFilterState, type LibraryStateFilter,
} from '@/lib/library-filters'
import { linkClass } from '@/lib/link-roles'

export interface IdeaRowData extends LibraryIdea {
  slug: string
  label: string
  familyLabel: string
}

const TF_WORD: Record<string, string> = { D1: '1 jour', H4: '4 heures', H1: '1 heure', M30: '30 minutes' }
const TF_ORDER = ['M30', 'H1', 'H4', 'D1']
const fr = (n: number) => n.toLocaleString('fr-FR')
export const plural = (n: number, one: string, many: string) => `${fr(n)} ${n > 1 ? many : one}`

const BUTTON = 'inline-flex min-h-11 items-center rounded border border-border-strong px-4 text-sm font-semibold text-foreground transition-colors hover:bg-card-2'
const SELECT = 'min-h-11 w-full min-w-0 rounded-md border border-border-strong bg-bg px-2 text-base sm:text-sm tabular-nums text-foreground focus:border-accent'

function Field({ label, value, onChange, children }: {
  label: string; value: string; onChange: (v: string) => void; children: ReactNode
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} className={SELECT}>{children}</select>
    </label>
  )
}

/** A count in a cell: the figure, and on a phone the column's name above it. */
function Count({ n, label, note }: { n: number; label: string; note?: string | null }) {
  return (
    <>
      <span className="block text-xs text-muted md:sr-only">{label}</span>
      <span className={`block text-xl font-medium leading-tight tabular-nums ${n === 0 ? 'text-muted' : ''}`}>{fr(n)}</span>
      {note && <span className="mt-1 block text-xs text-muted">{note}</span>}
    </>
  )
}

const CELL = 'align-top max-md:block md:py-4 md:pl-4 md:text-right'

function Row({ idea, live, stars }: { idea: IdeaRowData; live: boolean; stars: boolean }) {
  return (
    <tr data-testid="library-row"
      className="border-b border-border max-md:grid max-md:grid-cols-2 max-md:gap-x-4 max-md:gap-y-3 max-md:py-4">
      <td className="align-top max-md:col-span-2 max-md:block md:py-4 md:pr-6">
        {/* The name is a 44 px target; it rises into the row's padding, as on the fleet.
            The idea star sits beside it, never inside (two targets in one link). */}
        <div className="-my-2 flex items-center gap-1">
          <Link href={`/bibliotheque/${idea.slug}`}
            className={linkClass('record', 'inline-flex min-h-11 items-center text-base font-semibold leading-snug')}>
            {`${idea.label} ${idea.tf}`}
          </Link>
          {stars && <FavoriteStar kind="idea" slug={idea.slug} name={`${idea.label} ${idea.tf}`} />}
        </div>
        <p className="text-xs text-muted">
          {`${idea.familyLabel} · ${TF_WORD[idea.tf] ?? idea.tf}`}
          <span className="md:hidden">{` · ${plural(idea.n_variants, 'variante', 'variantes')}`}</span>
        </p>
      </td>
      {live && <td className={CELL}><Count n={idea.n_live} label="Argent réel" /></td>}
      <td className={CELL}><Count n={idea.n_paper} label="En simulation" note={scoreNote(idea.score) ?? simLine(idea)} /></td>
      <td className={CELL}><Count n={idea.n_backtest} label="Backtest seul" /></td>
      <td className={`${CELL} max-md:hidden`}>
        <Count n={idea.n_variants} label="Variantes"
          note={idea.n_stopped > 0 ? `dont ${plural(idea.n_stopped, 'arrêtée', 'arrêtées')}` : null} />
      </td>
    </tr>
  )
}

export default function LibraryIndex({ ideas, initialState = EMPTY_LIBRARY_FILTERS, defaultSort = EMPTY_LIBRARY_FILTERS.sort, stars = false }: {
  ideas: IdeaRowData[]; initialState?: LibraryFilterState
  /** Idea stars and the « Les plus gardées » order (IDEA_STARS_LIVE on the page). */
  stars?: boolean
  /** The order an empty URL means: « Plus de variantes », or « Les plus solides » once
   *  10 ideas are ranked (lot 2c, defaultLibrarySort on the server). */
  defaultSort?: IdeaSort
}) {
  const pathname = usePathname()
  const [state, setState] = useState<LibraryFilterState>(initialState)
  const listRef = useRef<HTMLTableSectionElement>(null)
  // The row that takes the focus after « Voir les N suivantes »: the first new one.
  const focusRow = useRef<number | null>(null)

  useEffect(() => {
    const onPop = () => setState(parseLibraryFilters(new URLSearchParams(window.location.search), defaultSort))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [defaultSort])

  const push = useCallback((next: LibraryFilterState) => {
    setState(next)
    const qs = serializeLibraryFilters(next, defaultSort).toString()
    window.history.replaceState(window.history.state, '', qs ? `${pathname}?${qs}` : pathname)
  }, [pathname, defaultSort])

  // A change of what is listed folds the list back to one page; a new order keeps it.
  const set = (patch: Partial<LibraryFilterState>) => push({ ...state, shown: LIBRARY_PAGE, ...patch })
  const reset = () => push({ ...EMPTY_LIBRARY_FILTERS, sort: state.sort })

  const list = useMemo(() => applyLibraryFilters(ideas, state), [ideas, state])
  const counts = useMemo(() => libraryOptionCounts(ideas, state), [ideas, state])
  const tfs = useMemo(() => [...new Set([...ideas.map(i => i.tf), ...(state.tf ? [state.tf] : [])])]
    .sort((a, b) => TF_ORDER.indexOf(a) - TF_ORDER.indexOf(b) || a.localeCompare(b)), [ideas, state.tf])
  const families = useMemo(() => [...new Map(ideas.map(i => [i.family, i.familyLabel])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1])), [ideas])
  const live = ideas.some(i => i.n_live > 0)

  const active = activeLibraryFilterCount(state)
  const empty = list.length === 0
  const visible = list.slice(0, state.shown)
  const remaining = list.length - visible.length
  const next = Math.min(LIBRARY_PAGE, remaining)
  const variants = list.reduce((n, i) => n + i.n_variants, 0)
  const narrowed = active > 0 || state.q.trim() !== ''

  useEffect(() => {
    if (focusRow.current === null) return
    const row = listRef.current?.querySelectorAll('[data-testid="library-row"]')[focusRow.current]
    focusRow.current = null
    row?.querySelector<HTMLAnchorElement>('a')?.focus()
  }, [state.shown])

  function showMore() {
    focusRow.current = visible.length
    push({ ...state, shown: state.shown + LIBRARY_PAGE })
  }

  // An option at (0) is disabled: picking it could only empty the list. The one in
  // force stays enabled, so a shared URL still shows what filters.
  const opt = (value: string, label: string, n: number, selected: boolean) => (
    <option key={value} value={value} disabled={n === 0 && !selected}>{`${label} (${n})`}</option>
  )

  return (
    <div>
      <div className="mb-4 max-w-md">
        <label htmlFor="library-search" className="mb-1 block text-xs font-semibold text-muted">Rechercher une idée</label>
        <div className="relative">
          <input id="library-search" type="text" value={state.q} autoComplete="off" spellCheck={false}
            onChange={e => set({ q: e.target.value })}
            placeholder="Donchian, RSI, H4, cassure…"
            className="min-h-11 w-full rounded-md border border-border-strong bg-bg pl-3 pr-12 text-base sm:text-sm text-foreground placeholder:text-muted focus:border-accent" />
          {state.q && (
            <button type="button" aria-label="Effacer la recherche" onClick={() => set({ q: '' })}
              className="absolute right-0 top-0 inline-flex h-11 w-11 items-center justify-center text-muted hover:text-foreground">
              <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
                <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* In the empty state the list's own button is the only way out, at every width. */}
      <StickyFilterBar activeCount={active} onReset={reset} showReset={!empty}>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:max-w-4xl">
            <Field label="Horizon" value={state.tf} onChange={v => set({ tf: v })}>
              <option value="">Tous</option>
              {tfs.map(t => opt(t, TF_WORD[t] ? `${t}, ${TF_WORD[t]}` : t, counts.tf[t] ?? 0, state.tf === t))}
            </Field>
            <Field label="Type d’idée" value={state.family} onChange={v => set({ family: v })}>
              <option value="">Tous</option>
              {families.map(([f, l]) => opt(f, l, counts.family[f] ?? 0, state.family === f))}
            </Field>
            <Field label="État" value={state.state} onChange={v => set({ state: v as LibraryStateFilter })}>
              <option value="">Tous</option>
              {opt('running', 'Au moins une lancée', counts.state.running, state.state === 'running')}
              {opt('backtest', 'Aucune lancée', counts.state.backtest, state.state === 'backtest')}
            </Field>
            <Field label="Trier par" value={state.sort} onChange={v => push({ ...state, sort: v as IdeaSort })}>
              {LIBRARY_SORTS.filter(k => k !== 'kept' || stars || state.sort === 'kept')
                .map(k => <option key={k} value={k}>{LIBRARY_SORT_LABEL[k]}</option>)}
            </Field>
          </div>
          {!empty && active > 0 && (
            <button type="button" onClick={reset}
              className={linkClass('inline', 'hidden min-h-11 items-center text-sm lg:inline-flex')}>
              Tout effacer
            </button>
          )}
        </div>
      </StickyFilterBar>

      <p data-testid="library-count" role="status" className="mb-4 text-sm text-muted">
        <span className="tabular-nums text-foreground">{plural(list.length, 'idée', 'idées')}</span>
        {narrowed
          ? ` sur ${fr(ideas.length)}, ${plural(variants, 'variante', 'variantes')}.`
          : `, ${plural(variants, 'variante', 'variantes')}, classées ${LIBRARY_SORT_LINE[state.sort]}.`}
      </p>
      {state.sort === 'solid' && (
        <p data-testid="library-solid-note" className="-mt-2 mb-4 max-w-[72ch] text-sm text-muted">
          {solidSortNote(ideas) ? `${solidSortNote(ideas)} ` : ''}
          Le gain prudent, c’est le gain moyen d’un trade en simulation pour 1 000 € engagés, moins
          sa marge d’erreur : il y a 9 chances sur 10 que la vraie moyenne soit au-dessus. Une
          journée compte une fois, même quand plusieurs variantes de l’idée y ont pris le même trade.
        </p>
      )}

      {empty ? (
        <div data-testid="library-empty" className="border-t border-border pt-6">
          <p className="text-base">
            {ideas.length === 0
              ? 'La bibliothèque est vide pour l’instant.'
              : 'Aucune idée ne correspond à cette recherche et à ces filtres.'}
          </p>
          {ideas.length > 0 && (
            <button type="button" onClick={reset} className={`mt-4 ${BUTTON}`}>
              {state.q.trim() ? 'Effacer la recherche et les filtres' : 'Retirer les filtres'}
            </button>
          )}
        </div>
      ) : (
        <>
          <FavoritesProvider kind="idea">
          <table data-testid="library-register" className="w-full border-collapse text-left max-md:block">
            <caption className="sr-only">{`Les idées de la bibliothèque, classées ${LIBRARY_SORT_LINE[state.sort]}`}</caption>
            <thead className="max-md:sr-only">
              <tr className="border-b border-border text-xs text-muted">
                <th scope="col" className="pb-2.5 pr-6 font-normal">Idée et horizon</th>
                {live && <th scope="col" className="whitespace-nowrap pb-2.5 pl-4 text-right font-normal">Argent réel</th>}
                <th scope="col" className="whitespace-nowrap pb-2.5 pl-4 text-right font-normal md:w-[32%]">En simulation</th>
                <th scope="col" className="whitespace-nowrap pb-2.5 pl-4 text-right font-normal">Backtest seul</th>
                <th scope="col" className="whitespace-nowrap pb-2.5 pl-4 text-right font-normal">Variantes</th>
              </tr>
            </thead>
            <tbody ref={listRef} className="max-md:block">
              {visible.map(i => <Row key={i.idea_key} idea={i} live={live} stars={stars} />)}
            </tbody>
          </table>
          </FavoritesProvider>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
            <p data-testid="library-shown" className="text-xs tabular-nums text-muted" aria-live="polite">
              {remaining > 0
                ? `${fr(visible.length)} idées affichées sur ${fr(list.length)}.`
                : `${plural(list.length, 'idée affichée', 'idées affichées')}, toute la liste.`}
            </p>
            {remaining > 0 && (
              <button type="button" data-testid="library-more" onClick={showMore} className={BUTTON}>
                {next > 1 ? `Voir les ${fr(next)} suivantes` : 'Voir la dernière'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
