'use client'

import { useMemo, useState } from 'react'
import type { BotWithStats, PerfDaily, Trade } from '@/lib/types'
import MetricsRow from '@/components/MetricsRow'
import EquityCurve from '@/components/EquityCurve'
import TradesTable from '@/components/TradesTable'
import DirectionFilterPills from '@/components/DirectionFilterPills'
import { computeBotStats, countByDirection, filterTrades, type DirectionFilter } from '@/lib/stats'
import { pnlEur, pnlPct, fmtEur, fmtPct, DISPLAY_CAPITAL } from '@/lib/display'

interface Props {
  bot: BotWithStats
}

/**
 * Build a synthetic perf_daily series from a filtered trade list.
 * Used when the user toggles long-only or short-only so the equity
 * curve reflects the chosen direction.
 */
function reconstructPerfDaily(trades: Trade[], startCapital = 1000): PerfDaily[] {
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

export default function StrategyDetail({ bot }: Props) {
  const [direction, setDirection] = useState<DirectionFilter>('all')

  const breakdown = useMemo(() => countByDirection(bot.all_trades), [bot.all_trades])

  const stats = useMemo(() => (
    direction === 'all'
      ? bot.stats
      : computeBotStats(bot.all_trades, bot.perf_daily, direction)
  ), [bot.all_trades, bot.perf_daily, bot.stats, direction])

  const equityData = useMemo(() => (
    direction === 'all'
      ? bot.perf_daily
      : reconstructPerfDaily(filterTrades(bot.all_trades, direction))
  ), [bot.all_trades, bot.perf_daily, direction])

  const tradesShown = useMemo(() => (
    direction === 'all'
      ? bot.recent_trades
      : filterTrades(bot.all_trades, direction).slice(0, 20)
  ), [bot.all_trades, bot.recent_trades, direction])

  const pct = pnlPct(stats.latest_capital)
  const eur = pnlEur(stats.latest_capital)

  return (
    <>
      {/* Filter + total breakdown */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted mb-1">Trades exposés</p>
          <p className="text-sm font-mono">
            <span className="font-bold">{breakdown.total}</span>
            {breakdown.total > 0 && (
              <span className="ml-2 text-muted">
                ({breakdown.long}L · {breakdown.short}S)
              </span>
            )}
          </p>
        </div>
        <DirectionFilterPills
          value={direction}
          onChange={setDirection}
          longCount={breakdown.long}
          shortCount={breakdown.short}
        />
      </div>

      {/* Key metrics — recomputed when filter changes */}
      <div className="mb-8">
        <MetricsRow stats={stats} />
      </div>

      {/* Equity curve */}
      <div className="bg-card border border-border rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">
            Courbe d&apos;équité
            {direction !== 'all' && (
              <span className="text-xs text-muted font-normal ml-2">
                — reconstruite sur {direction === 'long' ? 'longs' : 'shorts'} uniquement
              </span>
            )}
          </h2>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted">Départ : {DISPLAY_CAPITAL}€</span>
            <span className={`font-mono font-semibold ${pct >= 0 ? 'text-positive' : 'text-negative'}`}>
              {fmtEur(eur)} ({fmtPct(pct)})
            </span>
          </div>
        </div>
        {equityData.length > 0 ? (
          <EquityCurve data={equityData} startCapital={1000} />
        ) : (
          <p className="text-muted text-sm text-center py-12">Aucun trade {direction === 'long' ? 'long' : 'short'} à afficher.</p>
        )}
        {bot.status === 'paper' && (
          <p className="text-xs text-muted/60 mt-3 text-center">
            ⚠ Paper trading — exécution simulée, aucun capital réel exposé
          </p>
        )}
      </div>

      {/* Recent trades */}
      <div className="bg-card border border-border rounded-xl p-6 mb-8">
        <h2 className="font-semibold mb-4">
          Trades récents
          <span className="text-muted text-sm font-normal ml-2">
            ({tradesShown.length} affiché{tradesShown.length > 1 ? 's' : ''}
            {direction !== 'all' && ` — ${direction === 'long' ? 'longs' : 'shorts'} uniquement`})
          </span>
        </h2>
        <TradesTable trades={tradesShown} />
      </div>
    </>
  )
}
