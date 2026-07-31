'use client'
// « La flotte » — stages 1 and 2.
//
//   Stage 1  real money, in cards, never mixed into the sort or the pagination.
//   Stage 2  the laboratory register: filterable, grouped by strategy,
//            archived collapsed at the bottom.
//
// Renamed from FleetClient (fix round 1, C1): this component no longer
// receives `aggregate` at all — the balance sheet (stage 0) moved to the
// server component `FleetBalance`, which renders outside this client
// boundary entirely. That is what makes "filters cannot reach the balance"
// a structural fact again instead of only a convention backed by a test:
// there is no prop path from here to there.
//
// FIX round 2 (new Important finding): no `useSearchParams()` here at all
// anymore, and no `<Suspense>` boundary around this component either (see
// FleetOverview). useSearchParams() forces a client-side-only render of
// everything inside its nearest Suspense boundary — the CSR bailout — which
// meant this page served crawlers two empty `animate-pulse` placeholders
// instead of the register's bot cards and every `/strategies/...` link,
// undercutting the FAQ JSON-LD this page carries specifically to be indexed.
// Filter state is now parsed server-side, in `overview/page.tsx`, from the
// route's `searchParams`, and handed down as `initialState`.
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { BotWithStats } from '@/lib/types'
import type { Family } from '@/lib/families'
import {
  EMPTY_FILTERS, parseFleetFilters, serializeFleetFilters, applyFleetFilters,
  optionCounts, activeFilterCount, describeEmptyResult, type FleetFilterState,
  type Venue,
} from '@/lib/bot-filters'
import { sortFleet } from '@/lib/fleet-sort'
import { groupByStrategy } from '@/lib/fleet-grouping'
import { splitCohorts } from '@/lib/cohort'
import { isLowSample } from '@/lib/display'
import BotCard from '@/components/BotCard'
import StatusBadge from '@/components/StatusBadge'
import FleetFilterBar from '@/components/FleetFilterBar'

export interface FleetRegisterProps {
  bots: BotWithStats[]
  initialState: FleetFilterState
}

export default function FleetRegister({ bots, initialState }: FleetRegisterProps) {
  const pathname = usePathname()

  // Seeded once from the server-parsed prop — no useSearchParams() read here,
  // by design (see file header). `state` is this component's own source of
  // truth from then on: `push()` below updates it directly and synchronously.
  const [state, setState] = useState<FleetFilterState>(initialState)

  // FIX round 2: the old string-keyed resync effect (keyed on
  // searchParams.toString()) is gone along with useSearchParams() itself.
  // Back/forward navigation still needs to update `state` from OUTSIDE this
  // component's own `push()` calls, so listen for `popstate` directly and
  // re-parse the URL ourselves. `push()`'s own `window.history.replaceState`
  // calls don't fire `popstate` (only real navigation — back/forward,
  // history.go — does), so this can't fight our own optimistic update the
  // way the old effect risked doing.
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
    // FIX round 1 (I1+I2, reviewer ruling), still the right call in round 2:
    // `router.replace()` triggered a full RSC round trip on every single pill
    // click even though no server-rendered prop here depends on these params.
    // `window.history.replaceState` (supported by the App Router since Next
    // 14.1 for exactly this shallow-routing case) updates the URL directly,
    // synchronously, with no round trip — and after round 2 removed the
    // searchParams-sync effect entirely, there is no longer any counterpart
    // for it to race against.
    window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname)
  }, [pathname])

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
    // data-testid added in fix round 1 (I3): the stage-0 invariant test needs
    // a handle on "did the register actually change" as well as "did the
    // balance stay the same" — otherwise a test that only checks the balance
    // is inert to the exact bug that round found (filtering silently doing
    // nothing).
    <div data-testid="fleet-register" className="space-y-12">
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
                      {/* FIX (final review, I3): next/link, not a raw <a>. This
                          page is dynamically rendered, so a full document
                          reload on Back pays a fresh server render of the whole
                          fan-out. Link is unrelated to the round-2 CSR bailout,
                          which was about useSearchParams. */}
                      <Link href={`/strategies/${bot.slug}`} className="text-sm hover:text-accent">
                        {bot.name}
                      </Link>
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
                  <Link href={`/strategies/${bot.slug}`}>{bot.name}</Link>
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
