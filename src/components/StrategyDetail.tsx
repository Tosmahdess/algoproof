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
import { pnlEur, pnlPct, fmtEur, fmtPct } from '@/lib/display'
import BacktestSegmentLegend from '@/components/BacktestSegmentLegend'
import { joinSegments, type BacktestSegment } from '@/lib/backtest-segment'

/** Recent trades shown on a phone before « Voir les N derniers » (D057). */
const TRADES_MOBILE = 5

interface Props {
  bot: BotWithStats
  /** Backtest drawn before the paper launch (pilot 2026-09-25). Unfiltered view only. */
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

  const stats = useMemo(() => (
    unfiltered
      ? bot.stats
      : computeBotStats(bot.all_trades, bot.perf_daily, direction, startCapital, asset)
  ), [bot.all_trades, bot.perf_daily, bot.stats, direction, asset, startCapital, unfiltered])

  const equityData = useMemo(() => (
    unfiltered
      ? bot.perf_daily
      : reconstructPerfDaily(filterTrades(bot.all_trades, direction, asset), startCapital)
  ), [bot.all_trades, bot.perf_daily, direction, asset, startCapital, unfiltered])

  // A filter rebuilds the paper curve from a subset of trades; the backtest has no such
  // subset, so it is shown on the whole-bot view only.
  const segmentRows = useMemo(() => (
    unfiltered && backtestSegment
      ? joinSegments(backtestSegment, bot.perf_daily, startCapital)
      : null
  ), [unfiltered, backtestSegment, bot.perf_daily, startCapital])

  const tradesShown = useMemo(() => (
    unfiltered
      ? bot.recent_trades
      : filterTrades(bot.all_trades, direction, asset).slice(0, 20)
  ), [bot.all_trades, bot.recent_trades, direction, asset, unfiltered])

  // Five rows on a phone (D057): twenty took 1 263 px. The choice survives a
  // filter change: a reader who asked for all of them keeps them.
  const [tousSurMobile, setTousSurMobile] = useState(false)
  const limiteMobile = tousSurMobile || tradesShown.length <= TRADES_MOBILE ? undefined : TRADES_MOBILE

  const pct = pnlPct(stats.latest_capital, startCapital)
  const eur = pnlEur(stats.latest_capital, startCapital)

  return (
    <>
      {/* Filter + total breakdown */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Trades exposés</p>
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
        <MetricsRow stats={stats} family={bot.family} />
      </div>

      {/* Equity curve */}
      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
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
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted">Départ : {startCapital}€</span>
            <span className={`font-mono font-semibold ${pct >= 0 ? 'text-positive' : 'text-negative'}`}>
              {fmtEur(eur)} ({fmtPct(pct)})
            </span>
          </div>
        </div>
        {segmentRows && backtestSegment ? (
          <>
            <EquityCurve data={equityData} startCapital={startCapital}
              segments={segmentRows} launchDate={backtestSegment.launchDate} />
            <BacktestSegmentLegend launchDate={backtestSegment.launchDate} />
          </>
        ) : equityData.length > 0 ? (
          <EquityCurve data={equityData} startCapital={startCapital} />
        ) : (
          <p className="text-muted text-sm text-center py-12">Aucun trade à afficher pour ce filtre.</p>
        )}
        {bot.status === 'paper' && (
          <p className="text-xs text-muted mt-3 text-center">
            ⚠ Paper trading : exécution simulée, aucun capital réel exposé
          </p>
        )}
      </div>

      {/* Recent trades */}
      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-3">
          Trades récents
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
