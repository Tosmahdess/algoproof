'use client'
// « La flotte » — stage 2: the laboratory register. Filterable (family only —
// see below), grouped by TIMEFRAME (one table per H4/D1/H1/…), archived
// collapsed at the bottom.
//
// Renamed from FleetClient (fix round 1, C1): this component no longer
// receives `aggregate` at all — the balance sheet (stage 0) moved to the
// server component `FleetBalance`, which renders outside this client
// boundary entirely. That is what makes "filters cannot reach the balance"
// a structural fact again instead of only a convention backed by a test:
// there is no prop path from here to there.
//
// FIX (layout, real-money cards hoisted): stage 1 (real money, `fleet-real`)
// used to render here too, fed by a `splitCohorts(bots)` call — meaning "real
// money never enters the filter pipeline" only held because nothing below
// this comment happened to read `live`. It is gone from this file now.
// `FleetOverview` computes the split server-side and hands this component
// only the bots it is actually meant to filter: no `live` cohort, no prop
// path to it, nothing to accidentally sort or paginate. `bots` below IS the
// laboratory register set (paper + archived already combined) — not the
// full fleet.
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
//
// FIX (per-timeframe rebuild, task 6): the card register — grouped by
// strategy via groupByStrategy, one <details> per fiche, dense rows with a
// sparkline — is gone. Replaced by one <BotTable> per timeframe
// (groupByTimeframe), the same table component the home page and the concept
// pages use. The sort control is gone with it (see FleetFilterBar's own
// comment): it reordered rows within a strategy group, and groupByTimeframe's
// order is fixed -- biggest gain first since 2026-08-20 -- so a sort `<select>` would change
// nothing on screen. The family filter survives — filtering by family before
// grouping by timeframe is a clean composition, unlike sort — as does the
// archived section, which was never grouped by strategy in the first place.
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { BotWithStats } from '@/lib/types'
import type { Family } from '@/lib/families'
import {
  EMPTY_FILTERS, parseFleetFilters, serializeFleetFilters, applyFleetFilters,
  optionCounts, activeFilterCount, describeEmptyResult, type FleetFilterState,
} from '@/lib/bot-filters'
import { byGainDesc, groupByTimeframe } from '@/lib/fleet-grouping'
import FleetFilterBar from '@/components/FleetFilterBar'
import BotTable from '@/components/BotTable'

export interface FleetRegisterProps {
  /** The laboratory register set only — paper + archived, already combined
   * by `FleetOverview`. Never includes a `live` bot; there is no `live`
   * cohort to derive here anymore. */
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

  const reset = useCallback(() => push(EMPTY_FILTERS), [push])

  // `bots` IS the register set (see FleetRegisterProps) — no split, no
  // `live` cohort to exclude here, because FleetOverview never included it.
  // `state.sort` / `state.dir` still round-trip in `filtered` via
  // applyFleetFilters's type (FleetFilterState carries them) but are never
  // read by anything below — see the file header and FleetFilterBar.
  const filtered = useMemo(() => applyFleetFilters(bots, state), [bots, state])
  const counts = useMemo(() => optionCounts(bots, state), [bots, state])
  const emptyMessage = useMemo(() => describeEmptyResult(bots, state), [bots, state])

  const timeframeGroups = useMemo(
    () => groupByTimeframe(filtered.filter(b => b.status !== 'archived')),
    [filtered],
  )
  // The archived section was always flat, never grouped by strategy — it
  // stays flat here too, just re-sorted the same way groupByTimeframe orders
  // within a group (biggest gain first, untraded last), so a visitor scanning down the page
  // sees one consistent ordering rule everywhere.
  const archivedVisible = useMemo(
    () => filtered
      .filter(b => b.status === 'archived')
      .sort(byGainDesc),
    [filtered],
  )

  return (
    // data-testid added in fix round 1 (I3): the stage-0 invariant test needs
    // a handle on "did the register actually change" as well as "did the
    // balance stay the same" — otherwise a test that only checks the balance
    // is inert to the exact bug that round found (filtering silently doing
    // nothing).
    <div data-testid="fleet-register" className="space-y-12">
      {/* ---------- Stage 2 : the laboratory register ---------- */}
      <section className="space-y-4">
        <h2 className="text-xs uppercase tracking-wider text-muted">Laboratoire · simulation</h2>

        <FleetFilterBar
          state={state}
          counts={counts}
          activeCount={activeFilterCount(state)}
          onToggleFamily={toggleFamily}
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
          <div className="space-y-8">
            {timeframeGroups.map(group => (
              <section key={group.tf} data-testid={`fleet-tf-${group.tf}`}>
                <h3 className="text-xs uppercase tracking-wider text-muted mb-3">
                  {`${group.tf} — ${group.bots.length} stratégie${group.bots.length > 1 ? 's' : ''}`}
                </h3>
                <BotTable bots={group.bots} showTf={false} />
              </section>
            ))}
          </div>
        )}

        {archivedVisible.length > 0 && (
          <details data-testid="fleet-archived" className="bg-card border border-border rounded-lg">
            <summary className="cursor-pointer px-4 py-3 text-xs uppercase tracking-wider text-muted">
              {`Archivés (${archivedVisible.length})`}
            </summary>
            <ul className="px-4 pb-4 divide-y divide-border">
              {/*
                FIX (brief bug, flagged in task-6-report.md): the brief's verbatim
                archived row rendered only `bot.name`. The archived section is
                intentionally flat (not grouped), so the strategy label — the
                thing that lets a visitor recognise a retired bot's family of
                trading logic — is otherwise nowhere in this row.
              */}
              {archivedVisible.map(bot => (
                <li key={bot.slug} className="py-3 text-sm opacity-60 flex items-center justify-between gap-4">
                  <Link href={`/strategies/bot/${bot.slug}`}>{bot.name}</Link>
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
