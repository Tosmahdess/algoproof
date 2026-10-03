// « La flotte », composed. Refonte « registre », lot 4 (2026-10-02): in reading
// order, the two totals, ONE register from the best result to the least good,
// then the journal and the 30-day curves folded, then the recent trades.
//
// Gone with this lot: the real-money cards above the register. The owner asked
// for one list (2026-10-02); the three real-money bots are rows of it, each with
// its regime badge and the state of its published rule (« État et décision »),
// and their total heads the page, apart from the simulation's. The cards also
// drew a 30-day line in the colour of the result since the start, a figure the
// line does not show (audit 2026-10, n° 8).
//
// Deliberately NOT `'use client'` and NOT `async`: plain JSX inside the server
// component tree. Everything but FleetRegister renders on this side of the
// client boundary, so no filter has a prop path to the totals, the journal or
// the curves: the stage-0 invariant is structural, not a convention.
import type { BotWithStats } from '@/lib/types'
import type { TradeWithBot } from '@/lib/types'
import type { FleetAggregate } from '@/lib/fleet-aggregate'
import { serializeFleetFilters, type FleetFilterState } from '@/lib/bot-filters'
import { splitCohorts } from '@/lib/cohort'
import { familyColor } from '@/lib/families'
import { last30Capital } from '@/lib/home-data'
import { simulationTotalSeries } from '@/lib/fleet-curves'
import { getBotExpectations } from '@/lib/bot-expectations'
import { ledgerState, type LedgerBot } from '@/lib/fleet-ledger'
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
  /** Minutes since the freshest sync, null when unknown. The page header says
   *  it; kept in the props so the page and the tests keep one shape. */
  minutes: number | null
}

const CURVE_DAYS = 30

export default function FleetOverview({
  bots, aggregate, recentTrades, initialState,
}: FleetOverviewProps) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - CURVE_DAYS)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const { live, paper, archived } = splitCohorts(bots)
  // Longest history first: the order of the curves' legend.
  const liveByHistory = [...live].sort((a, b) => b.stats.total_trades - a.stats.total_trades)

  // What crosses into the client register: the trade fields the browser reads,
  // a 30-value window for the row's line, and the row's state in a few words.
  // Never perf_daily, never recent_trades (measured 2026-09-23: 5.92 MB of HTML
  // before this projection), never the expectations file.
  const registerBots: LedgerBot[] = [...live, ...paper, ...archived].map(b => {
    const { perf_daily, list_perf_daily, recent_trades: _rt, all_trades, ...rest } = b
    return {
      ...rest,
      all_trades: all_trades.map(t => ({
        side: t.side, pnl: t.pnl, asset: t.asset, closed_at: t.closed_at,
      })),
      // an engine bot's row reads its simulation, like its figures (D073)
      spark30: last30Capital(list_perf_daily ?? perf_daily),
      ledger: b.status === 'archived' ? null : ledgerState(b, getBotExpectations(b.slug)),
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

  return (
    <div className="space-y-10">
      <FleetTotals aggregate={aggregate} liveCount={live.length} paperCount={paper.length}
        bases={{ real: live.map(b => b.start_capital), labo: paper.map(b => b.start_capital) }} />

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
        className="border-t border-border pt-6"
        titreClassName="text-lg font-semibold"
        corpsClassName="mt-4"
      >
        <GlobalEquityCurve bots={curves} days={CURVE_DAYS} />
      </Repli>

      <FleetRecentTrades trades={recentTrades} />
    </div>
  )
}
