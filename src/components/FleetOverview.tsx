// « La flotte » — composes stage 0 (server-rendered, unfilterable) with
// stages 1+2 (client, filterable, but now seeded server-side — see below).
// Deliberately NOT `'use client'` and NOT `async`: it is plain, synchronous
// JSX so it renders inside the server component tree
// (`src/app/overview/page.tsx`) exactly like any other server component, and
// so it stays trivially testable with a synchronous render() call — no data
// fetching to mock, just props in, markup out.
//
// FIX round 2 (new Important finding): no more `<Suspense>` here, and no
// more fallback component. The Suspense boundary existed only to satisfy
// Next's requirement that a client component calling useSearchParams() sit
// inside one — but that requirement exists BECAUSE useSearchParams() forces
// a client-side-only render (a "CSR bailout") of everything inside the
// boundary, which meant the fallback's two `animate-pulse` placeholder divs
// were literally what got served to crawlers instead of the register's bot
// cards and /strategies links. `FleetRegister` no longer calls
// useSearchParams() at all — filter state is parsed server-side in
// `overview/page.tsx` and passed down as `initialState` — so there is no
// bailout left to contain, and the boundary would only have been decorative.
//
// FIX (final review, I1+I2): three pieces of content the retired /overview page
// carried — the market-intelligence banner, « Courbes d'équité — 30 jours » and
// the fleet-wide recent-trades feed — vanished with OverviewClient without
// anyone deciding to retire them (GlobalEquityCurve and MiBanner were left in
// the tree with zero importers; the trades feed existed on no page at all).
// They are restored HERE, in stage 0, alongside the balance sheet: all three
// are page-level, unfiltered and cohort-safe, and keeping them on this side of
// the client boundary means none of them can re-enter the filter pipeline.
import type { BotWithStats } from '@/lib/types'
import type { TradeWithBot } from '@/lib/types'
import type { FleetAggregate } from '@/lib/fleet-aggregate'
import { serializeFleetFilters, type FleetFilterState } from '@/lib/bot-filters'
import FleetBalance from '@/components/FleetBalance'
import FleetRecentTrades from '@/components/FleetRecentTrades'
import FleetRegister from '@/components/FleetRegister'
import GlobalEquityCurve from '@/components/GlobalEquityCurve'
import MiBanner from '@/components/MiBanner'

export interface FleetOverviewProps {
  bots: BotWithStats[]
  aggregate: FleetAggregate
  recentTrades: TradeWithBot[]
  initialState: FleetFilterState
}

// Same palette the retired page used, so a returning visitor recognises the
// curves. Twelve entries for the twelve most-traded bots.
const CURVE_COLORS = [
  '#3fb950', '#58a6ff', '#ff6b35', '#d2a8ff', '#f6c90e', '#40c4ff',
  '#ff4444', '#4ade80', '#fb923c', '#a78bfa', '#14b8a6', '#7c3aed',
]

export default function FleetOverview({
  bots, aggregate, recentTrades, initialState,
}: FleetOverviewProps) {
  // Archived bots are excluded from every aggregate on this page, and a dead
  // bot's flat line is noise on a 30-day chart. Same rule as the balance sheet.
  const curveBots = bots
    .filter(b => b.status !== 'archived' && b.stats.total_trades > 0)
    .sort((a, b) => b.stats.total_trades - a.stats.total_trades)
    .slice(0, 12)
    .map((b, i) => ({
      slug: b.slug,
      name: b.name,
      color: CURVE_COLORS[i % CURVE_COLORS.length],
      data: b.perf_daily.map(p => ({ date: p.date, capital: p.capital })),
    }))

  return (
    <div className="space-y-12">
      <section data-testid="fleet-mi" className="space-y-3">
        <h2 className="text-xs uppercase tracking-wider text-muted">Météo du marché</h2>
        <MiBanner />
      </section>

      <FleetBalance aggregate={aggregate} />

      {curveBots.length > 0 && (
        <section data-testid="fleet-equity-curves" className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-baseline gap-3 mb-4">
            <h2 className="text-xs uppercase tracking-wider text-muted">Courbes d&apos;équité — 30 jours</h2>
            <span className="text-xs text-muted">{curveBots.length} bots les plus actifs</span>
          </div>
          <GlobalEquityCurve bots={curveBots} days={30} />
        </section>
      )}

      <FleetRecentTrades trades={recentTrades} />
      {/*
        FIX round 3 (Finding A, reviewer ruling): FleetRegister seeds its
        state ONCE from `initialState` (useState(initialState), no resync
        from the prop). That's correct for a real navigation — the server
        component remounts and a fresh initialState arrives with it — but the
        App Router keys a page segment WITHOUT its search params, so a
        search-params-only navigation (e.g. clicking a plain `<Link
        href="/overview">` in the nav while already on a filtered
        /overview?family=breakout) re-renders this same component instance
        instead of remounting it. FleetRegister would then keep its stale
        filtered state while the server-sent initialState silently went back
        to EMPTY_FILTERS underneath it.
        `key` forces the issue: a new initialState value serializes to a
        different key, which IS enough to make React unmount the old
        FleetRegister and mount a fresh one, re-seeding useState(initialState)
        from scratch. One line, can't go stale (it's derived from the exact
        value being seeded, not tracked separately), needs no effect.
      */}
      <FleetRegister
        key={serializeFleetFilters(initialState).toString()}
        bots={bots}
        initialState={initialState}
      />
    </div>
  )
}
