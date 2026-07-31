'use client'
// « La flotte » — three stages.
//
//   Stage 0  the balance sheet. UNFILTERABLE, by design and by test. A
//            filterable aggregate is the tool for telling a flattering story;
//            the unfiltered total is what makes this page defensible.
//   Stage 1  real money, in cards, never mixed into the sort or the pagination.
//   Stage 2  the laboratory register: filterable, grouped by strategy,
//            archived collapsed at the bottom.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import type { BotWithStats } from '@/lib/types'
import type { Family } from '@/lib/families'
import {
  EMPTY_FILTERS, parseFleetFilters, serializeFleetFilters, applyFleetFilters,
  optionCounts, activeFilterCount, describeEmptyResult, type FleetFilterState,
  type Venue,
} from '@/lib/bot-filters'
import { sortFleet } from '@/lib/fleet-sort'
import { groupByStrategy } from '@/lib/fleet-grouping'
import type { FleetAggregate } from '@/lib/fleet-aggregate'
import { splitCohorts } from '@/lib/cohort'
import { fmtEur, isLowSample } from '@/lib/display'
import BotCard from '@/components/BotCard'
import StatusBadge from '@/components/StatusBadge'
import FleetFilterBar from '@/components/FleetFilterBar'

export interface FleetClientProps {
  bots: BotWithStats[]
  aggregate: FleetAggregate
}

export default function FleetClient({ bots, aggregate }: FleetClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // FIX (brief bug, flagged in task-6-report.md): the brief derived `state` with
  // `useMemo(..., [searchParams])`. `useSearchParams()` returns a fresh
  // `URLSearchParams` instance on every render in this test's next/navigation
  // mock (and in some real navigation cases too), so keying a memo off that
  // object's identity recomputes — and resets to EMPTY_FILTERS — on every
  // render, including the one caused by our own toggle. A toggle would visibly
  // never stick. State is local (source of truth for this render), seeded once
  // from the URL, and pushed back to the URL for shareability. A separate
  // effect resyncs from the URL when it changes from OUTSIDE this component
  // (back/forward navigation, a shared link) — keyed on the STRING, not the
  // object, so an unstable-reference-but-same-value hook doesn't fight our own
  // optimistic update.
  const [state, setState] = useState<FleetFilterState>(() =>
    parseFleetFilters(new URLSearchParams(searchParams.toString())),
  )

  const searchParamsString = searchParams.toString()
  useEffect(() => {
    setState(parseFleetFilters(new URLSearchParams(searchParamsString)))
  }, [searchParamsString])

  const push = useCallback((next: FleetFilterState) => {
    setState(next)
    const qs = serializeFleetFilters(next).toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [router, pathname])

  const toggleFamily = useCallback((f: Family) => {
    push({
      ...state,
      family: state.family.includes(f) ? state.family.filter(x => x !== f) : [...state.family, f],
    })
  }, [state, push])

  const toggleVenue = useCallback((v: Venue) => {
    push({
      ...state,
      venue: state.venue.includes(v) ? state.venue.filter(x => x !== v) : [...state.venue, v],
    })
  }, [state, push])

  const reset = useCallback(() => push(EMPTY_FILTERS), [push])

  const { live, paper, archived } = useMemo(() => splitCohorts(bots), [bots])

  // Stage 2 only. `live` never enters the filter pipeline.
  const registerBots = useMemo(() => [...paper, ...archived], [paper, archived])
  const filtered = useMemo(() => applyFleetFilters(registerBots, state), [registerBots, state])
  const sorted = useMemo(() => sortFleet(filtered, state.sort, state.dir), [filtered, state])
  const counts = useMemo(() => optionCounts(registerBots, state), [registerBots, state])
  const emptyMessage = useMemo(() => describeEmptyResult(registerBots, state), [registerBots, state])

  const activeGroups = useMemo(
    () => groupByStrategy(sorted.filter(b => b.status !== 'archived')),
    [sorted],
  )
  const archivedVisible = useMemo(() => sorted.filter(b => b.status === 'archived'), [sorted])

  return (
    <div className="space-y-12">
      {/* ---------- Stage 0 : the balance sheet, outside the filter pipeline ---------- */}
      <section data-testid="fleet-balance" className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xs uppercase tracking-wider text-muted mb-4">Le bilan</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-xs text-muted">Argent réel</div>
            <div className="text-xl font-mono">{fmtEur(aggregate.totalPnlReal)}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Laboratoire · simulation</div>
            <div className="text-xl font-mono">{fmtEur(aggregate.totalPnlLabo)}</div>
          </div>
        </div>
        <p className="text-xs text-muted mt-4">
          {aggregate.totalTrades} trades depuis le début. Ces deux totaux ne se
          fusionnent jamais et ne bougent pas avec les filtres ci-dessous.
        </p>
      </section>

      {/* ---------- Stage 1 : real money ---------- */}
      <section data-testid="fleet-real" className="space-y-4">
        <h2 className="text-xs uppercase tracking-wider text-muted">Argent réel</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {live.map(bot => <BotCard key={bot.slug} bot={bot} />)}
        </div>
      </section>

      {/* ---------- Stage 2 : the laboratory register ---------- */}
      <section className="space-y-4">
        <h2 className="text-xs uppercase tracking-wider text-muted">Laboratoire · simulation</h2>

        <FleetFilterBar
          state={state}
          counts={counts}
          activeCount={activeFilterCount(state)}
          onToggleFamily={toggleFamily}
          onToggleVenue={toggleVenue}
          onReset={reset}
        />

        {emptyMessage ? (
          <div data-testid="fleet-empty" className="bg-card border border-border rounded-lg p-6 text-sm">
            <p>{emptyMessage}</p>
            <button type="button" onClick={reset} className="mt-3 text-xs text-accent underline">
              Retirer les filtres
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {activeGroups.map(group => (
              <details key={group.key} open className="bg-card border border-border rounded-lg">
                <summary className="cursor-pointer px-4 py-3 text-sm">
                  {`${group.label} — ${group.bots.length} incarnation(s), dont ${group.promotedCount} promue(s)`}
                </summary>
                <ul className="px-4 pb-4 divide-y divide-border">
                  {group.bots.map(bot => (
                    <li key={bot.slug} className="py-3 flex items-center justify-between gap-4">
                      <a href={`/strategies/${bot.slug}`} className="text-sm hover:text-accent">
                        {bot.name}
                      </a>
                      <span className="flex items-center gap-3 text-xs text-muted font-mono">
                        <span>{bot.stats.total_trades} trades</span>
                        {bot.stats.total_trades === 0 && <span>en attente d&apos;un signal</span>}
                        {isLowSample(bot.stats.total_trades) && <span>trop tôt pour conclure</span>}
                        <StatusBadge status={bot.status} />
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        )}

        {archivedVisible.length > 0 && (
          <details data-testid="fleet-archived" className="bg-card border border-border rounded-lg">
            <summary className="cursor-pointer px-4 py-3 text-xs uppercase tracking-wider text-muted">
              {`Archivés — ${archivedVisible.length}`}
            </summary>
            <ul className="px-4 pb-4 divide-y divide-border">
              {/*
                FIX (brief bug, flagged in task-6-report.md): the brief's verbatim
                archived row rendered only `bot.name`. The archived section is
                intentionally flat (not grouped by strategy like the active
                register above), so the strategy label — the thing that lets a
                visitor recognise a retired bot's family of trading logic — is
                otherwise nowhere in this row.
              */}
              {archivedVisible.map(bot => (
                <li key={bot.slug} className="py-3 text-sm opacity-60 flex items-center justify-between gap-4">
                  <a href={`/strategies/${bot.slug}`}>{bot.name}</a>
                  <span className="text-xs text-muted">{bot.strategy}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </div>
  )
}
