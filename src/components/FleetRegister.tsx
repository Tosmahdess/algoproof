'use client'
// « La flotte », the register: every bot in ONE list, from the best result to
// the least good (owner decision, 2026-10-02, refonte « registre », lot 4),
// every timeframe in it, filterable by family, timeframe and side.
//
// No tier any more. Until 2026-10-02 the proven bots came first, then the bots
// under 20 trades, then the untraded, and every sort ran inside each tier: the
// ranking was cut in two by the rodage. Now a bot under LOW_SAMPLE_TRADES wears
// « rodage » on its own row, and only a bot without a trade leaves the ranking:
// it goes last with « — » (fleet-sort.ts). Archived bots stay folded last: they
// no longer run, and they were never part of the ranking (cohort.ts).
//
// The page is long and will get longer (115 bots in October 2026, thousands
// later, audit n° 43): the list shows PAGE rows and a « Voir les N suivants »
// button, never a fold that would hide the losers at the bottom.
//
// What this component does NOT hold, by construction: the two totals, the
// journal, the curves and the recent trades all render in FleetOverview,
// outside this client boundary, so no filter has a prop path to them. `bots`
// here IS the register set (live included), rows projected to what the browser
// reads (FleetRegisterPayload.test.tsx), each with its state already computed
// on the server (fleet-ledger.ts).
//
// Filter state is seeded once from the server-parsed `initialState` (no
// useSearchParams(): it forced a client-only render that served crawlers two
// placeholders instead of the register). `push()` updates the URL with
// replaceState, popstate re-parses it for back/forward.
import StickyFilterBar from '@/components/StickyFilterBar'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Family } from '@/lib/families'
import { linkClass } from '@/lib/link-roles'
import { frNumber, LOW_SAMPLE_TRADES } from '@/lib/display'
import type { SortKey } from '@/lib/bot-filters'
import {
  EMPTY_FILTERS, parseFleetFilters, serializeFleetFilters, applyFleetFilters,
  optionCounts, activeFilterCount, describeEmptyResult, type FleetFilterState,
} from '@/lib/bot-filters'
import { sortFleet } from '@/lib/fleet-sort'
import type { LedgerBot } from '@/lib/fleet-ledger'
import FleetFilterBar from '@/components/FleetFilterBar'
import FleetLedger, { plural } from '@/components/FleetLedger'
import MetricsLegend from '@/components/MetricsLegend'
import { FavoritesProvider } from '@/components/FavoritesProvider'
import { FollowsProvider } from '@/components/FollowsProvider'

export interface FleetRegisterProps {
  /** The register set: the whole fleet, live included, archived included. */
  bots: LedgerBot[]
  initialState: FleetFilterState
}

/** Rows shown before « Voir les N suivants ». */
export const PAGE = 50

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  const norm = (xs: readonly string[]) => [...new Set(xs.map(x => x.toUpperCase()))].sort().join(',')
  return norm(a) === norm(b)
}

// The line under the title names the order in force.
const SORT_LINE: Record<SortKey, string> = {
  pnl: 'du meilleur résultat au moins bon',
  proven: 'triés par nombre de trades',
  trades: 'triés par nombre de trades',
  profit_factor: 'triés par facteur de profit',
  pct: 'triés par % de gain',
  win_rate: 'triés par taux de gain',
  max_drawdown: 'triés par drawdown',
}

const BUTTON = 'inline-flex min-h-11 items-center rounded-md border border-border-strong px-4 text-sm font-semibold text-foreground hover:bg-card-2'

export default function FleetRegister({ bots, initialState }: FleetRegisterProps) {
  const pathname = usePathname()
  const [state, setState] = useState<FleetFilterState>(initialState)
  const [shown, setShown] = useState(PAGE)
  const listRef = useRef<HTMLDivElement>(null)
  // The row that takes the focus after « Voir les N suivants »: the first new
  // one, so a keyboard reader goes on from where the list grew.
  const focusRow = useRef<number | null>(null)

  useEffect(() => {
    function onPopState() {
      setState(parseFleetFilters(new URLSearchParams(window.location.search)))
      setShown(PAGE)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const push = useCallback((next: FleetFilterState) => {
    setState(next)
    setShown(PAGE)
    const qs = serializeFleetFilters(next).toString()
    window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname)
  }, [pathname])

  const setFamily = useCallback((f: Family | null) => {
    push({ ...state, family: f ? [f] : [] })
  }, [state, push])

  const setTimeframe = useCallback((tf: string | null) => {
    push({ ...state, timeframe: tf ? [tf] : [] })
  }, [state, push])

  const setSide = useCallback((side: 'all' | 'long' | 'short') => {
    push({ ...state, side })
  }, [state, push])

  // A sort is not a filter: it never lights the filter count, and clearing
  // the filters keeps it.
  const setSort = useCallback((sort: SortKey) => {
    push({ ...state, sort, dir: 'desc' })
  }, [state, push])

  const reset = useCallback(() => push({ ...EMPTY_FILTERS, sort: state.sort, dir: state.dir }), [state.sort, state.dir, push])

  const filtered = useMemo(() => applyFleetFilters(bots, state), [bots, state])
  const counts = useMemo(() => optionCounts(bots, state), [bots, state])
  const emptyMessage = useMemo(() => describeEmptyResult(bots, state), [bots, state])

  // `filtered` decides WHICH bots are rows. The side slice only changes what a
  // row SHOWS, and so where it ranks: a bot with forty trades and no short
  // shows « — » on the short side and goes with the untraded (sliceBotStats
  // returns bot.stats by reference when nothing is sliced).
  const { rows, archived } = useMemo(() => {
    // The server computed each row's three sides (lot 1b): with no asset filter, and
    // for the asset set the URL carried at render time. The register can only clear
    // that set (reset), never pick another one -- if it ever did, reloading beats
    // showing figures computed for a different set.
    const assetSet = state.asset.length === 0 ? null
      : sameSet(state.asset, initialState.asset) ? 'url' : 'unknown'
    if (assetSet === 'unknown' && typeof window !== 'undefined') window.location.reload()
    const slice = (b: LedgerBot) => ({
      ...b,
      stats: (assetSet === 'url' ? b.assetSlices ?? b.slices : b.slices)[state.side],
    })
    return {
      rows: sortFleet(filtered.filter(b => b.status !== 'archived').map(slice), state.sort, state.dir),
      archived: sortFleet(filtered.filter(b => b.status === 'archived'), state.sort, state.dir),
    }
  }, [filtered, state.side, state.asset, state.sort, state.dir, initialState.asset])

  const visible = rows.slice(0, shown)
  const remaining = rows.length - visible.length
  const next = Math.min(PAGE, remaining)
  const rodageCount = rows.filter(r => r.stats.total_trades > 0 && r.stats.total_trades < LOW_SAMPLE_TRADES).length
  const hasEngineBot = visible.some(b => b.slug.startsWith('arm-'))

  useEffect(() => {
    if (focusRow.current === null) return
    const row = listRef.current?.querySelectorAll('[data-testid="fleet-row"]')[focusRow.current]
    focusRow.current = null
    row?.querySelector<HTMLAnchorElement>('a[href^="/strategies/bot/"]')?.focus()
  }, [shown])

  function showMore() {
    focusRow.current = visible.length
    setShown(n => n + PAGE)
  }

  // The experiment line counts the UNFILTERED register: what runs here, and where
  // it came from. Engine-born bots carry an engine_unit_key; the others were
  // deployed by hand before the engine existed.
  const inService = bots.filter(b => b.status !== 'archived')
  const engineBorn = inService.filter(b => b.engine_unit_key !== null).length
  const byHand = inService.length - engineBorn
  const sortLine = SORT_LINE[state.sort]

  return (
    <section data-testid="fleet-register" aria-labelledby="fleet-register-title" className="border-t border-border pt-9">
      <div className="mb-5">
        <h2 id="fleet-register-title" className="text-2xl font-semibold tracking-tight">
          Tous les bots{' '}<span className="tabular-nums font-normal text-muted">{frNumber(inService.length, 0)}</span>
        </h2>
        <p data-testid="fleet-sort-line" className="mt-2 max-w-[65ch] text-sm text-muted">
          Argent réel et simulation dans la même liste, {sortLine}. Chaque ligne porte son régime ; leurs totaux restent séparés.
        </p>
        <p data-testid="fleet-experiment" className="mt-2 max-w-[65ch] text-sm leading-relaxed text-muted">
          <span className="tabular-nums text-foreground">{frNumber(engineBorn, 0)}</span>{' '}configurations qui ont passé mes quatre épreuves (le gantelet) tournent ici, mises en service sans tri par résultat,
          à côté de{' '}<span className="tabular-nums text-foreground">{frNumber(byHand, 0)}</span>{' '}{byHand > 1 ? 'bots déployés' : 'bot déployé'}{' '}à la main avant le moteur.{' '}
          <Link href="/strategies#comment-je-decide" className={linkClass('inline')}>Le protocole →</Link>
        </p>
      </div>

      {/* In the empty state the list's own button is the only way out: the bar
          drops its « Tout effacer » (audit n° 75, two reset buttons). */}
      <StickyFilterBar activeCount={activeFilterCount(state)} onReset={reset} showReset={!emptyMessage}>
        <FleetFilterBar
          state={state}
          counts={counts}
          showReset={!emptyMessage && activeFilterCount(state) > 0}
          onFamily={setFamily}
          onTimeframe={setTimeframe}
          onSide={setSide}
          onSort={setSort}
          onReset={reset}
        />
      </StickyFilterBar>

      {emptyMessage ? (
        <div data-testid="fleet-empty" role="status" className="pt-2">
          <p className="text-base">{emptyMessage}</p>
          <button type="button" onClick={reset} className={`mt-4 ${BUTTON}`}>
            Retirer les filtres
          </button>
        </div>
      ) : (
        <div ref={listRef} data-testid="fleet-table">
          {/* One request for every star of the list (espace-direct lot C),
              one for every bell (lot H). */}
          <FollowsProvider slugs={rows.map(r => r.slug)}>
            <FavoritesProvider kind="bot">
              <FleetLedger bots={visible} caption={`Tous les bots, ${sortLine}`} />
            </FavoritesProvider>
          </FollowsProvider>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
            <p data-testid="fleet-shown" className="text-xs tabular-nums text-muted" aria-live="polite">
              {remaining > 0
                ? `${frNumber(visible.length, 0)} bots affichés sur ${frNumber(rows.length, 0)}.`
                : `${plural(rows.length, 'bot affiché', 'bots affichés')}, toute la liste.`}
            </p>
            {remaining > 0 && (
              <button type="button" data-testid="fleet-more" onClick={showMore} className={BUTTON}>
                {next > 1 ? `Voir les ${frNumber(next, 0)} suivants` : 'Voir le dernier'}
              </button>
            )}
          </div>

          <div className="mt-6 max-w-[75ch] space-y-2 text-xs leading-relaxed text-muted">
            {rodageCount > 0 && (
              <p data-testid="fleet-rodage-note">
                « rodage » : moins de {LOW_SAMPLE_TRADES} trades, trop tôt pour conclure sur ce résultat. Les bots sans trade viennent en dernier, sans résultat.
              </p>
            )}
            {hasEngineBot && (
              <p>
                Bots moteur : chiffres de leur simulation depuis la fin des données qui ont servi à
                les sélectionner, trades rejoués compris, en euros pour 1 000 € de départ. Leur fiche
                montre la même simulation sur le capital atteint par sa courbe, d&apos;où des euros un
                peu différents. Le total « Simulation » en haut de page ne compte, lui, que les trades
                enregistrés depuis le lancement de chaque bot.
              </p>
            )}
            <MetricsLegend />
          </div>
        </div>
      )}

      {archived.length > 0 && (
        <details data-testid="fleet-archived" className="mt-8 border-t border-border">
          <summary className="flex min-h-11 cursor-pointer items-center py-3 text-sm text-muted">
            {`Archivés (${archived.length}) : ils ne tournent plus et ne sont pas classés.`}
          </summary>
          <ul className="divide-y divide-border pb-4">
            {archived.map(bot => (
              <li key={bot.slug} className="flex items-center justify-between gap-4 py-3 text-sm">
                <Link href={`/strategies/bot/${bot.slug}`} className={linkClass('record')}>{bot.name}</Link>
                <span className="text-xs text-muted">{bot.strategy}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
