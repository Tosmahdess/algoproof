'use client'
// « La flotte » — stage 2: the laboratory register. Filterable, grouped by
// strategy, archived collapsed at the bottom.
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
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { BotWithStats } from '@/lib/types'
import type { Family } from '@/lib/families'
import {
  EMPTY_FILTERS, parseFleetFilters, serializeFleetFilters, applyFleetFilters,
  optionCounts, activeFilterCount, describeEmptyResult, type FleetFilterState,
  type SortKey,
} from '@/lib/bot-filters'
import { sortFleet } from '@/lib/fleet-sort'
import { groupByStrategy } from '@/lib/fleet-grouping'
import { isLowSample, pnlEur, fmtEur, fmtPfDisplay } from '@/lib/display'
import StatusBadge from '@/components/StatusBadge'
import FleetFilterBar from '@/components/FleetFilterBar'
import Sparkline from '@/components/Sparkline'

/** The last 30 daily capital points, for the row thumbnail. */
const SPARK_DAYS = 30

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

  // FIX (final whole-branch review, I1): the sort was parsed from the URL,
  // applied by sortFleet and labelled by SORT_LABELS, but no control ever set
  // it — inert state behind a comment claiming a feature. Wired through the
  // same `push()` as the pills, so a chosen sort survives sharing and the back
  // button exactly like a filter does.
  const setSort = useCallback((sort: SortKey) => push({ ...state, sort }), [state, push])
  const toggleDir = useCallback(
    () => push({ ...state, dir: state.dir === 'desc' ? 'asc' : 'desc' }),
    [state, push],
  )

  const reset = useCallback(() => push(EMPTY_FILTERS), [push])

  // `bots` IS the register set (see FleetRegisterProps) — no split, no
  // `live` cohort to exclude here, because FleetOverview never included it.
  const filtered = useMemo(() => applyFleetFilters(bots, state), [bots, state])
  const sorted = useMemo(() => sortFleet(filtered, state.sort, state.dir), [filtered, state])
  const counts = useMemo(() => optionCounts(bots, state), [bots, state])
  const emptyMessage = useMemo(() => describeEmptyResult(bots, state), [bots, state])

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
      {/* ---------- Stage 2 : the laboratory register ---------- */}
      <section className="space-y-4">
        <h2 className="text-xs uppercase tracking-wider text-muted">Laboratoire · simulation</h2>

        <FleetFilterBar
          state={state}
          counts={counts}
          activeCount={activeFilterCount(state)}
          onToggleFamily={toggleFamily}
          onSort={setSort}
          onToggleDir={toggleDir}
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
                {/* The group header links to the concept page when a fiche
                    claims this group, and stays plain text when none does (a
                    grid bot, a delta-neutral carry bot). `group.ficheSlug` is
                    decided by groupByStrategy through ficheSlugForBot — the
                    same call that decided the grouping — so the header can only
                    link to a page that lists the bots underneath it. Resolving
                    it a second time here, from the label, is what used to make
                    that guarantee a coincidence.

                    stopPropagation because a click on an <a> inside a
                    <summary> would otherwise also toggle the <details>: the
                    visitor would navigate away AND collapse the group they
                    left behind. */}
                <summary className="cursor-pointer px-4 py-3 text-sm">
                  {group.ficheSlug ? (
                    <Link
                      href={`/strategies/${group.ficheSlug}`}
                      onClick={e => e.stopPropagation()}
                      className="hover:text-accent"
                    >
                      {group.label}
                    </Link>
                  ) : group.label}
                  {/* The aggregate trade count is the group-level version of the
                      "most proven first" story: at 100 bots, « 14 incarnations ·
                      2 431 trades » is what makes a family readable at a glance. */}
                  {` : ${group.bots.length} incarnation(s), dont ${group.promotedCount} promue(s) · ${group.bots.reduce((n, b) => n + b.stats.total_trades, 0)} trades`}
                </summary>
                <ul className="px-4 pb-4 divide-y divide-border">
                  {group.bots.map(bot => {
                    const spark = bot.perf_daily.slice(-SPARK_DAYS).map(p => p.capital)
                    const pnl = pnlEur(bot.stats.latest_capital, bot.start_capital)
                    return (
                    <li key={bot.slug} className="py-3 flex items-center justify-between gap-4">
                      {/* FIX (final review, I3): next/link, not a raw <a>. This
                          page is dynamically rendered, so a full document
                          reload on Back pays a fresh server render of the whole
                          fan-out. Link is unrelated to the round-2 CSR bailout,
                          which was about useSearchParams. */}
                      <Link href={`/strategies/bot/${bot.slug}`} className="text-sm hover:text-accent">
                        {bot.name}
                      </Link>
                      <span className="flex items-center gap-3 text-xs text-muted font-mono">
                        {/* The thumbnail inherits currentColor from this span, so
                            the trend decides the color and Sparkline stays dumb. */}
                        {spark.length >= 2 && (
                          <span
                            className={`hidden sm:inline-flex ${spark[spark.length - 1] >= spark[0] ? 'text-positive' : 'text-negative'}`}
                          >
                            <Sparkline values={spark} />
                          </span>
                        )}
                        <span>{bot.stats.total_trades} trades</span>
                        {bot.stats.total_trades === 0 && <span>en attente d&apos;un signal</span>}
                        {isLowSample(bot.stats.total_trades) && <span>trop tôt pour conclure</span>}
                        <span className="hidden sm:inline">
                          PF <span>{fmtPfDisplay(bot.family, bot.stats.total_trades, bot.stats.profit_factor)}</span>
                        </span>
                        {bot.stats.total_trades > 0 && (
                          <span className={pnl >= 0 ? 'text-positive' : 'text-negative'}>
                            {fmtEur(pnl)}
                          </span>
                        )}
                        <StatusBadge status={bot.status} />
                      </span>
                    </li>
                    )
                  })}
                </ul>
              </details>
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
                intentionally flat (not grouped by strategy like the active
                register above), so the strategy label — the thing that lets a
                visitor recognise a retired bot's family of trading logic — is
                otherwise nowhere in this row.
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
