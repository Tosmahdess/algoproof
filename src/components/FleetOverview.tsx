// « La flotte », composed (lot 4 of the design audit, 2026-09-25, conception
// §5.2). In reading order: the two totals, the real-money cards (the lot 3 card,
// with its 30-day line and the state of its published rule), the register, then
// the journal and the 30-day curves folded, then the recent trades.
//
// Gone with this lot: the market-weather banner (a copy of /intelligence,
// fetched client-side in the first screen), « Le bilan » as an open block (its
// totals moved up, its table folded) and the twelve-colour equity chart (the
// curves now carry the real-money bots and ONE simulation series).
//
// Deliberately NOT `'use client'` and NOT `async`: plain JSX inside the server
// component tree. Everything but FleetRegister renders on this side of the
// client boundary, so no filter has a prop path to the totals, the cards, the
// journal or the curves: the stage-0 invariant is structural, not a convention.
import type { BotWithStats, FleetBot } from '@/lib/types'
import type { TradeWithBot } from '@/lib/types'
import type { FleetAggregate } from '@/lib/fleet-aggregate'
import { serializeFleetFilters, type FleetFilterState } from '@/lib/bot-filters'
import { splitCohorts } from '@/lib/cohort'
import { familyColor } from '@/lib/families'
import { last30Capital } from '@/lib/home-data'
import { simulationTotalSeries } from '@/lib/fleet-curves'
import { RealMoneyCard } from '@/components/home/HomeRealMoney'
import MetricsLegend from '@/components/MetricsLegend'
import FleetTotals from '@/components/FleetTotals'
import FleetJournal from '@/components/FleetJournal'
import FleetRecentTrades from '@/components/FleetRecentTrades'
import FleetRegister from '@/components/FleetRegister'
import GlobalEquityCurve from '@/components/GlobalEquityCurve'
import Repli from '@/components/Repli'

export interface FleetOverviewProps {
  bots: BotWithStats[]
  aggregate: FleetAggregate
  recentTrades: TradeWithBot[]
  initialState: FleetFilterState
  /** Minutes since the freshest sync, null when unknown. */
  minutes: number | null
}

const CURVE_DAYS = 30

const fresh = (minutes: number | null) => (minutes === null ? null : minutes < 2 ? 'à l’instant' : `il y a ${minutes} min`)

export default function FleetOverview({
  bots, aggregate, recentTrades, initialState, minutes,
}: FleetOverviewProps) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - CURVE_DAYS)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const { live, paper, archived } = splitCohorts(bots)
  // Longest history first, the same rule as the home and the table (C7).
  const liveByHistory = [...live].sort((a, b) => b.stats.total_trades - a.stats.total_trades)

  // What crosses into the client register: the trade fields the browser reads,
  // and a 30-value window for the row's sparkline. Never perf_daily, never
  // recent_trades (measured 2026-09-23: 5.92 MB of HTML before this projection).
  const registerBots: FleetBot[] = [...live, ...paper, ...archived].map(b => {
    const { perf_daily, recent_trades: _rt, all_trades, ...rest } = b
    return {
      ...rest,
      all_trades: all_trades.map(t => ({
        side: t.side, pnl: t.pnl, asset: t.asset, closed_at: t.closed_at,
      })),
      spark30: last30Capital(perf_daily),
    }
  })

  // Four series at most: each real-money bot in its family colour, the
  // simulation as one grey total. The window is applied HERE, before the
  // boundary: GlobalEquityCurve is a client component.
  const curves = [
    ...liveByHistory.map(b => {
      // A chart series, not a text label: §3.1 keeps family colours for curves.
      const stroke = familyColor(b.family)
      return {
        slug: b.slug,
        name: b.name,
        color: stroke,
        data: b.perf_daily
          .filter(p => p.date >= cutoffStr)
          .map(p => ({ date: p.date, capital: p.capital })),
      }
    }),
    {
      slug: 'simulation',
      name: 'Simulation, P&L total',
      color: 'var(--muted)',
      data: simulationTotalSeries(paper, cutoffStr),
    },
  ]
  const f = fresh(minutes)

  return (
    <div className="space-y-10">
      <FleetTotals aggregate={aggregate} liveCount={live.length} paperCount={paper.length} />

      {live.length > 0 && (
        <section data-testid="fleet-real" aria-label="Argent réel">
          <div className="flex items-baseline justify-between gap-4 mb-3">
            <h2 className="text-base font-semibold">Argent réel</h2>
            {f && <span className="text-xs text-muted">{f}</span>}
          </div>
          {/* `grid-cols-1` is not decoration: an implicit auto track is sized by the
              widest nowrap child of a card, and the column overflowed to 459 px at
              390 px (same trap as the home hero, lot 3). */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {liveByHistory.map(bot => <RealMoneyCard key={bot.slug} bot={bot} testId="fleet-bot-card" />)}
          </div>
          <MetricsLegend className="mt-3 max-w-[70ch]" />
        </section>
      )}

      {/* `key`: a search-params-only navigation re-renders this instance instead
          of remounting it; a new initialState serialises to a new key, so the
          register re-seeds instead of keeping a stale filter. */}
      <FleetRegister
        key={serializeFleetFilters(initialState).toString()}
        bots={registerBots}
        initialState={initialState}
      />

      <FleetJournal rows={aggregate.rows} />

      <Repli
        id="courbes"
        testId="fleet-equity-curves"
        titre="Courbes 30 jours"
        resume={`${live.length} ${live.length > 1 ? 'bots réels' : 'bot réel'} et le total simulation, en P&L`}
        toujoursPliable
        className="bg-card border border-border rounded-lg p-5 sm:p-6"
        titreClassName="text-base font-semibold"
        corpsClassName="mt-4"
      >
        <GlobalEquityCurve bots={curves} days={CURVE_DAYS} />
      </Repli>

      <FleetRecentTrades trades={recentTrades} />
    </div>
  )
}
