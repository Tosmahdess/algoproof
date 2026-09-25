'use client'
// « La flotte », the register: every bot in ONE table, sorted by history
// (trades descending, C7), every timeframe in it, filterable by family,
// timeframe and side. Lot 4 of the design audit (2026-09-25, conception §5.2):
// the per-timeframe sections (« H4 : 55 stratégies ») are gone, a visitor looks
// for a bot, not a horizon. Bots between 1 and 19 trades fold under the table
// (« En rodage »: a PF on 4 trades is not a figure to rank, audit P0-5), the
// bots that never traded under their own line, the archived ones last.
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
import { familyLabel } from '@/lib/families'
import { linkClass } from '@/lib/link-roles'
import { frNumber } from '@/lib/display'
import {
  EMPTY_FILTERS, parseFleetFilters, serializeFleetFilters, applyFleetFilters,
  optionCounts, activeFilterCount, describeEmptyResult, type FleetFilterState,
} from '@/lib/bot-filters'
import { byHistoryDesc, splitBySample } from '@/lib/fleet-grouping'
import { sliceBotStats } from '@/lib/stats'
import FleetFilterBar from '@/components/FleetFilterBar'
import BotTable from '@/components/BotTable'
import StatusBadge from '@/components/StatusBadge'

export interface FleetRegisterProps {
  /** The register set: the whole fleet, live included, archived included. */
  bots: FleetBot[]
  initialState: FleetFilterState
}

const plural = (n: number, one: string, many: string) => (n > 1 ? many : one)

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

  const toggleFamily = useCallback((f: Family) => {
    push({
      ...state,
      family: state.family.includes(f) ? state.family.filter(x => x !== f) : [...state.family, f],
    })
  }, [state, push])

  const toggleTimeframe = useCallback((tf: string) => {
    push({
      ...state,
      timeframe: state.timeframe.includes(tf) ? state.timeframe.filter(x => x !== tf) : [...state.timeframe, tf],
    })
  }, [state, push])

  const toggleSide = useCallback((side: 'long' | 'short') => {
    push({ ...state, side: state.side === side ? 'all' : side })
  }, [state, push])

  const reset = useCallback(() => push(EMPTY_FILTERS), [push])

  const filtered = useMemo(() => applyFleetFilters(bots, state), [bots, state])
  const counts = useMemo(() => optionCounts(bots, state), [bots, state])
  const emptyMessage = useMemo(() => describeEmptyResult(bots, state), [bots, state])

  // `filtered` decides WHICH bots are rows and, by their WHOLE history, which
  // group they sit in. The side slice only changes what a row SHOWS: a bot with
  // forty trades and no short stays a proven row with « — » cells, it does not
  // fall into « Sans trade encore » (sliceBotStats returns bot.stats by
  // reference when nothing is sliced).
  const { proven, rodage, untraded, archived } = useMemo(() => {
    const slice = (b: FleetBot) => ({ ...b, stats: sliceBotStats(b, state.side, state.asset) })
    const order = (list: FleetBot[]) => list.map(slice).sort(byHistoryDesc)
    const active = filtered.filter(b => b.status !== 'archived')
    const { proven, rodage: small } = splitBySample(active)
    return {
      proven: order(proven),
      rodage: order(small.filter(b => b.stats.total_trades > 0)),
      untraded: order(small.filter(b => b.stats.total_trades === 0)),
      archived: order(filtered.filter(b => b.status === 'archived')),
    }
  }, [filtered, state.side, state.asset])

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
        <span className="text-xs text-muted">argent réel et simulation, triés par nombre de trades</span>
      </div>

      <p data-testid="fleet-experiment" className="text-xs text-muted leading-relaxed border-l-2 border-border-strong pl-3">
        <span className="text-foreground font-medium">Expérience en cours.</span>{' '}
        <span className="font-mono text-foreground">{frNumber(engineBorn, 0)}</span> configurations issues du gantelet tournent ici sans tri par résultat,
        à côté de <span className="font-mono text-foreground">{frNumber(byHand, 0)}</span> {plural(byHand, 'bot déployé', 'bots déployés')} à la main avant le moteur.{' '}
        <Link href="/strategies#comment-je-decide" className={linkClass('inline')}>Le protocole →</Link>
      </p>

      <StickyFilterBar activeCount={activeFilterCount(state)} onReset={reset}>
        <FleetFilterBar
          state={state}
          counts={counts}
          activeCount={activeFilterCount(state)}
          onToggleFamily={toggleFamily}
          onToggleTimeframe={toggleTimeframe}
          onToggleSide={toggleSide}
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
        <div className="space-y-3">
          {proven.length > 0 && (
            <div data-testid="fleet-table">
              <BotTable bots={proven} showTf />
            </div>
          )}

          {rodage.length > 0 && (
            <details data-testid="fleet-rodage" className="bg-card border border-border rounded-lg">
              <summary className="cursor-pointer px-4 py-3 text-xs text-muted min-h-10">
                {`En rodage · ${rodage.length} ${plural(rodage.length, 'bot', 'bots')} entre 1 et 19 trades : un taux de gain ou un facteur de profit ne veut encore rien dire ici.`}
              </summary>
              <div className="px-4 pb-4 pt-2">
                <BotTable bots={rodage} showTf />
              </div>
            </details>
          )}

          {untraded.length > 0 && (
            <details data-testid="fleet-untraded" className="bg-card border border-border rounded-lg">
              <summary className="cursor-pointer px-4 py-3 text-xs text-muted min-h-10">
                {`Sans trade encore · ${untraded.length} ${plural(untraded.length, 'bot', 'bots')}. Pas de tendance, pas de trade : c’est voulu.`}
              </summary>
              <ul className="px-4 pb-4 divide-y divide-border">
                {untraded.map(bot => (
                  <li key={bot.slug} className="py-2.5 text-sm flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <Link href={`/strategies/bot/${bot.slug}`} className={linkClass('record')}>{bot.name}</Link>
                      <span className="block text-xs text-muted font-mono">{familyLabel(bot.family)} · {bot.timeframe}</span>
                    </span>
                    <StatusBadge status={bot.status} />
                  </li>
                ))}
              </ul>
            </details>
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
