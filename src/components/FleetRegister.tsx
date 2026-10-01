'use client'
// « La flotte », the register: every bot in ONE table, sorted by history
// (trades descending, C7) unless the visitor picks another sort, every
// timeframe in it, filterable by family, timeframe and side. Lot 4 of the
// design audit (2026-09-25, conception §5.2): the per-timeframe sections
// (« H4 : 55 stratégies ») are gone, a visitor looks for a bot, not a horizon.
//
// 2026-09-30 (user): the « En rodage » and « Sans trade encore » folds are gone
// too, their bots are rows of the same table. What audit P0-5 protected (a PF on
// 4 trades is not a figure to rank) is kept by TIERS instead of cards: proven
// bots first, then 1-19 trades, then untraded, and every sort orders INSIDE a
// tier, so the luckiest small sample never tops the table. Archived bots stay
// folded last: they no longer run.
//
// What this component does NOT hold, by construction: the two totals, the
// real-money cards, the journal, the curves and the recent trades all render in
// FleetOverview, outside this client boundary, so no filter has a prop path to
// them. `bots` here IS the register set (live included since 2026-08-20), rows
// projected to what the browser reads (FleetRegisterPayload.test.tsx).
//
// Filter state is seeded once from the server-parsed `initialState` (no
// useSearchParams(): it forced a client-only render that served crawlers two
// placeholders instead of the register). `push()` updates the URL with
// replaceState, popstate re-parses it for back/forward.
import StickyFilterBar from '@/components/StickyFilterBar'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { FleetBot } from '@/lib/types'
import type { Family } from '@/lib/families'
import { linkClass } from '@/lib/link-roles'
import { frNumber, LOW_SAMPLE_TRADES } from '@/lib/display'
import type { SortKey } from '@/lib/bot-filters'
import {
  EMPTY_FILTERS, parseFleetFilters, serializeFleetFilters, applyFleetFilters,
  optionCounts, activeFilterCount, describeEmptyResult, type FleetFilterState,
} from '@/lib/bot-filters'
import { byHistoryDesc, splitBySample } from '@/lib/fleet-grouping'
import { sortFleet } from '@/lib/fleet-sort'
import { sliceBotStats } from '@/lib/stats'
import FleetFilterBar from '@/components/FleetFilterBar'
import BotTable from '@/components/BotTable'
import { FavoritesProvider } from '@/components/FavoritesProvider'
import { FollowsProvider } from '@/components/FollowsProvider'

export interface FleetRegisterProps {
  /** The register set: the whole fleet, live included, archived included. */
  bots: FleetBot[]
  initialState: FleetFilterState
}

const plural = (n: number, one: string, many: string) => (n > 1 ? many : one)

// The line under the title names the sort in force: it said « nombre de
// trades » whatever the list said until 2026-09-30.
const SORT_LINE: Partial<Record<SortKey, string>> = {
  proven: 'nombre de trades',
  trades: 'nombre de trades',
  profit_factor: 'facteur de profit',
  pct: '% de gain',
  pnl: 'gain en euros',
  win_rate: 'taux de gain',
  max_drawdown: 'drawdown',
}

export default function FleetRegister({ bots, initialState }: FleetRegisterProps) {
  const pathname = usePathname()
  const [state, setState] = useState<FleetFilterState>(initialState)

  useEffect(() => {
    function onPopState() {
      setState(parseFleetFilters(new URLSearchParams(window.location.search)))
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const push = useCallback((next: FleetFilterState) => {
    setState(next)
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

  // `filtered` decides WHICH bots are rows and, by their WHOLE history, which
  // group they sit in. The side slice only changes what a row SHOWS: a bot with
  // forty trades and no short stays a proven row with « — » cells, it does not
  // fall into « Sans trade encore » (sliceBotStats returns bot.stats by
  // reference when nothing is sliced).
  const { rows, rodageCount, archived } = useMemo(() => {
    const slice = (b: FleetBot) => ({ ...b, stats: sliceBotStats(b, state.side, state.asset) })
    // The history sort IS byHistoryDesc (trades, then gain, then name); any
    // other sort falls back to it on ties, so equal PFs keep a stable order.
    const order = (list: FleetBot[]) => {
      const byHistory = list.map(slice).sort(byHistoryDesc)
      return state.sort === 'proven' ? byHistory : sortFleet(byHistory, state.sort, state.dir)
    }
    const active = filtered.filter(b => b.status !== 'archived')
    const { proven, rodage: small } = splitBySample(active)
    const rodage = small.filter(b => b.stats.total_trades > 0)
    const untraded = small.filter(b => b.stats.total_trades === 0)
    return {
      rows: [...order(proven), ...order(rodage), ...untraded.map(slice).sort(byHistoryDesc)],
      rodageCount: rodage.length,
      archived: order(filtered.filter(b => b.status === 'archived')),
    }
  }, [filtered, state.side, state.asset, state.sort, state.dir])

  // The experiment line counts the UNFILTERED register: what runs here, and where
  // it came from. Engine-born bots carry an engine_unit_key; the others were
  // deployed by hand before the engine existed.
  const inService = bots.filter(b => b.status !== 'archived')
  const engineBorn = inService.filter(b => b.engine_unit_key !== null).length
  const byHand = inService.length - engineBorn

  return (
    <div data-testid="fleet-register" className="space-y-4">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <h2 className="text-base font-semibold">
          Tous les bots · <span className="font-mono">{frNumber(inService.length, 0)}</span>
        </h2>
        <span data-testid="fleet-sort-line" className="text-xs text-muted">argent réel et simulation, triés par {SORT_LINE[state.sort] ?? SORT_LINE.proven}</span>
      </div>

      <p data-testid="fleet-experiment" className="text-xs text-muted leading-relaxed border-l-2 border-border-strong pl-3">
        <span className="text-foreground font-medium">Expérience en cours.</span>{' '}
        <span className="font-mono text-foreground">{frNumber(engineBorn, 0)}</span>{' '}configurations qui ont passé mes quatre épreuves (le gantelet) tournent ici sans tri par résultat,
        à côté de <span className="font-mono text-foreground">{frNumber(byHand, 0)}</span> {plural(byHand, 'bot déployé', 'bots déployés')} à la main avant le moteur.{' '}
        <Link href="/strategies#comment-je-decide" className={linkClass('inline')}>Le protocole →</Link>
      </p>

      <StickyFilterBar activeCount={activeFilterCount(state)} onReset={reset}>
        <FleetFilterBar
          state={state}
          counts={counts}
          activeCount={activeFilterCount(state)}
          onFamily={setFamily}
          onTimeframe={setTimeframe}
          onSide={setSide}
          onSort={setSort}
          onReset={reset}
        />
      </StickyFilterBar>

      {emptyMessage ? (
        <div data-testid="fleet-empty" className="bg-card border border-border rounded-lg p-6 text-sm">
          <p>{emptyMessage}</p>
          <button type="button" onClick={reset} className="mt-3 text-sm text-accent underline">
            Retirer les filtres
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.length > 0 && (
            <div data-testid="fleet-table">
              {/* One request for every star of the table (espace-direct lot C),
                  one for every bell (lot H). */}
              <FollowsProvider slugs={rows.map(r => r.slug)}>
                <FavoritesProvider kind="bot">
                  <BotTable bots={rows} showTf fleetTotalAbove />
                </FavoritesProvider>
              </FollowsProvider>
            </div>
          )}
          {rodageCount > 0 && (
            <p data-testid="fleet-rodage-note" className="text-xs text-muted">
              {`${rodageCount} ${plural(rodageCount, 'bot a', 'bots ont')} entre 1 et ${LOW_SAMPLE_TRADES - 1} trades (marqués « rodage ») : ${plural(rodageCount, 'il reste', 'ils restent')} après les autres quel que soit le tri, parce qu’un facteur de profit sur quatre trades ne se classe pas. Les bots sans trade viennent en dernier.`}
            </p>
          )}
        </div>
      )}

      {archived.length > 0 && (
        <details data-testid="fleet-archived" className="bg-card border border-border rounded-lg">
          <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-muted min-h-10">
            {`Archivés (${archived.length})`}
          </summary>
          <ul className="px-4 pb-4 divide-y divide-border">
            {archived.map(bot => (
              <li key={bot.slug} className="py-3 text-sm opacity-60 flex items-center justify-between gap-4">
                <Link href={`/strategies/bot/${bot.slug}`}>{bot.name}</Link>
                <span className="text-xs text-muted">{bot.strategy}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
