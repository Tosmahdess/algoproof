'use client'

import { useMemo, useState } from 'react'
import type { BotWithStats, PerfDaily, Trade } from '@/lib/types'
import MetricsRow from '@/components/MetricsRow'
import EquityCurve from '@/components/EquityCurve'
import TradesTable from '@/components/TradesTable'
import DirectionFilterPills from '@/components/DirectionFilterPills'
import AssetFilterSelect from '@/components/AssetFilterSelect'
import AlsoLiveBadge from '@/components/AlsoLiveBadge'
import { computeBotStats, countByDirection, filterTrades, type DirectionFilter } from '@/lib/stats'
import { assetOptionsFromTrades } from '@/lib/asset'
import { pnlEur, pnlPct, fmtEur, fmtPct, frNumber } from '@/lib/display'
import BacktestSegmentLegend from '@/components/BacktestSegmentLegend'
import BacktestBlock from '@/components/BacktestBlock'
import { longDateOrdinal } from '@/lib/format-date'
import { buildTimeline, type BacktestSegment } from '@/lib/backtest-segment'

/** Recent trades shown on a phone before « Voir les N derniers » (D057). */
const TRADES_MOBILE = 5

interface Props {
  bot: BotWithStats
  /** Backtest drawn before the simulation (pilot 2026-09-25). Unfiltered view only. */
  backtestSegment?: BacktestSegment | null
}

/**
 * Build a synthetic perf_daily series from a filtered trade list.
 * Used when the user toggles long-only or short-only so the equity
 * curve reflects the chosen direction.
 */
function reconstructPerfDaily(trades: Trade[], startCapital: number): PerfDaily[] {
  if (trades.length === 0) return []
  const sorted = [...trades].sort(
    (a, b) => new Date(a.closed_at).getTime() - new Date(b.closed_at).getTime(),
  )
  const byDate: Record<string, number> = {}
  for (const t of sorted) {
    const day = t.closed_at.slice(0, 10)
    byDate[day] = (byDate[day] ?? 0) + t.pnl
  }
  let running = startCapital
  return Object.keys(byDate).sort().map(date => {
    const pnl_day = byDate[date]
    running += pnl_day
    return {
      id: date,
      bot_id: sorted[0].bot_id,
      date,
      capital: running,
      pnl_day,
      win_rate: null,
      profit_factor: null,
    }
  })
}

export default function StrategyDetail({ bot, backtestSegment = null }: Props) {
  const [direction, setDirection] = useState<DirectionFilter>('all')
  const [asset, setAsset] = useState<string>('all')
  const startCapital = bot.start_capital

  const breakdown = useMemo(() => countByDirection(bot.all_trades), [bot.all_trades])
  const assetOptions = useMemo(() => assetOptionsFromTrades(bot.all_trades), [bot.all_trades])
  const unfiltered = direction === 'all' && asset === 'all'

  // The simulation starts the day after the recipe's dataset ends (user, 2026-09-28): its
  // figures, curve and trades come from the timeline, the paper amounts resized on the
  // capital the curve had reached. A filter rebuilds the paper from a subset of ledger
  // trades, which the backtest has no counterpart for, so it falls back to the ledger view.
  const timeline = useMemo(() => (
    backtestSegment
      ? buildTimeline(backtestSegment, bot.perf_daily, bot.all_trades, startCapital)
      : null
  ), [backtestSegment, bot.perf_daily, bot.all_trades, startCapital])
  const sim = unfiltered ? timeline : null
  // The backtest's own block does not depend on the filter, only on the file agreeing
  // with the paper ledger (buildTimeline refuses otherwise).
  const segment = timeline ? backtestSegment : null

  const stats = useMemo(() => (
    sim
      ? sim.simStats
      : unfiltered
      ? bot.stats
      : computeBotStats(bot.all_trades, bot.perf_daily, direction, startCapital, asset)
  ), [bot.all_trades, bot.perf_daily, bot.stats, direction, asset, startCapital, unfiltered, sim])

  const equityData = useMemo(() => (
    unfiltered
      ? bot.perf_daily
      : reconstructPerfDaily(filterTrades(bot.all_trades, direction, asset), startCapital)
  ), [bot.all_trades, bot.perf_daily, direction, asset, startCapital, unfiltered])

  const tradesShown = useMemo(() => (
    sim
      ? sim.simTrades.slice(0, 20)
      : unfiltered
      ? bot.recent_trades
      : filterTrades(bot.all_trades, direction, asset).slice(0, 20)
  ), [bot.all_trades, bot.recent_trades, direction, asset, unfiltered, sim])

  // Five rows on a phone (D057): twenty took 1 263 px. The choice survives a
  // filter change: a reader who asked for all of them keeps them.
  const [tousSurMobile, setTousSurMobile] = useState(false)
  const limiteMobile = tousSurMobile || tradesShown.length <= TRADES_MOBILE ? undefined : TRADES_MOBILE

  // The curve header gives the whole curve's result from its start (1 January on a
  // segmented curve); the simulation's own result, read from ITS start, comes second
  // (user, 2026-09-29: « +0,9 % » beside « 1 000 € le 1er janvier » read as the total).
  const pct = pnlPct(stats.latest_capital, startCapital)
  const eur = pnlEur(stats.latest_capital, startCapital)
  const simPct = sim ? pnlPct(stats.latest_capital, sim.simStartCapital) : 0
  const simEur = sim ? pnlEur(stats.latest_capital, sim.simStartCapital) : 0

  return (
    <>
      {/* Filter + total breakdown */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-semibold text-muted">Trades exposés</p>
            <AlsoLiveBadge slug={bot.slug} status={bot.status} />
          </div>
          <p className="text-sm font-mono">
            <span className="font-bold">{breakdown.total}</span>
            {breakdown.total > 0 && (
              <span className="ml-2 text-muted">
                ({breakdown.long}L · {breakdown.short}S)
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <AssetFilterSelect options={assetOptions} value={asset} onChange={setAsset} />
          <DirectionFilterPills
            value={direction}
            onChange={setDirection}
            longCount={breakdown.long}
            shortCount={breakdown.short}
          />
        </div>
      </div>

      {/* Key metrics — recomputed when filter changes */}
      <div className="mb-8">
        {sim && (
          <p className="text-xs font-semibold text-muted mb-2">
            Simulation depuis le {longDateOrdinal(sim.simStart)}
          </p>
        )}
        <MetricsRow stats={stats} family={bot.family} />
      </div>

      {/* Equity curve */}
      <div className="bg-card border border-border rounded-lg p-4 sm:p-5 mb-8">
        {/* Title and figures stack on a phone: sharing one row left the title 113 px (O-M2). */}
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-xl font-semibold">
            Courbe d&apos;équité
            {!unfiltered && (
              <span className="text-xs text-muted font-normal ml-2">
                (reconstruite sur {[
                  asset !== 'all' ? asset : null,
                  direction === 'long' ? 'longs' : direction === 'short' ? 'shorts' : null,
                ].filter(Boolean).join(' · ')} uniquement)
              </span>
            )}
          </h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="text-muted whitespace-nowrap">
              {sim
                ? `Depuis ${frNumber(startCapital, 0)} € le 1er janvier :`
                : `Départ : ${frNumber(startCapital, 0)} €`}
            </span>
            <span className={`font-mono font-semibold ${pct >= 0 ? 'text-positive' : 'text-negative'}`}>
              {fmtEur(eur)} ({fmtPct(pct)})
            </span>
            {sim && (
              <span className="text-muted whitespace-nowrap">
                dont simulation{' '}
                <span className={`font-mono ${simPct >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {fmtEur(simEur)} ({fmtPct(simPct)})
                </span>
              </span>
            )}
          </div>
        </div>
        {sim && segment ? (
          <>
            <EquityCurve data={equityData} startCapital={startCapital}
              segments={sim.rows} freezeDate={segment.freezeDate} />
            <BacktestSegmentLegend freezeDate={segment.freezeDate} simStart={sim.simStart} />
          </>
        ) : equityData.length > 0 ? (
          <EquityCurve data={equityData} startCapital={startCapital} />
        ) : (
          <p className="text-muted text-sm text-center py-12">Aucun trade à afficher pour ce filtre.</p>
        )}
        {bot.status === 'paper' && (
          <p className="text-xs text-muted mt-3 text-center">
            Paper trading : exécution simulée, aucun capital réel exposé
          </p>
        )}
      </div>

      {segment && <BacktestBlock segment={segment} />}

      {/* Recent trades */}
      <div className="bg-card border border-border rounded-lg p-4 sm:p-5 mb-8">
        <h2 className="text-xl font-semibold mb-3">
          Trades récents{sim ? ' de la simulation' : ''}
          <span className="text-muted text-sm font-normal ml-2">
            {/* The counter says what THIS screen shows: « 5 sur 20 » on a phone
                while folded, « 20 affichés » everywhere else. */}
            {limiteMobile !== undefined && (
              <span className="sm:hidden">({limiteMobile} sur {tradesShown.length} affichés</span>
            )}
            <span className={limiteMobile !== undefined ? 'hidden sm:inline' : ''}>
              ({tradesShown.length} affiché{tradesShown.length > 1 ? 's' : ''}
            </span>
            {!unfiltered && ` (${[
              asset !== 'all' ? asset : null,
              direction === 'long' ? 'longs' : direction === 'short' ? 'shorts' : null,
            ].filter(Boolean).join(' · ')} uniquement)`})
          </span>
        </h2>
        <TradesTable trades={tradesShown} limiteMobile={limiteMobile} />
        {limiteMobile !== undefined && (
          <button
            type="button"
            onClick={() => setTousSurMobile(true)}
            className="sm:hidden mt-4 w-full rounded border border-border px-3 py-2 text-sm text-muted hover:text-foreground transition-colors"
          >
            Voir les {tradesShown.length} derniers
          </button>
        )}
      </div>
    </>
  )
}
