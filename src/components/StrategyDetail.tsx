'use client'

import { useMemo, useState } from 'react'
import type { BotWithStats, PerfDaily, Trade } from '@/lib/types'
import MetricsRow, { type DrawdownTone } from '@/components/MetricsRow'
import EquityCurve from '@/components/EquityCurve'
import TradesTable, { type TradesTotal } from '@/components/TradesTable'
import DirectionFilterPills from '@/components/DirectionFilterPills'
import AssetFilterSelect from '@/components/AssetFilterSelect'
import AlsoLiveBadge from '@/components/AlsoLiveBadge'
import { computeBotStats, countByDirection, filterTrades, type DirectionFilter } from '@/lib/stats'
import { assetOptionsFromTrades } from '@/lib/asset'
import { pnlEur, pnlPct, fmtEur, fmtPct, frNumber, NARROW_NBSP } from '@/lib/display'
import { cumulativeAfterEach, sumOfResults } from '@/lib/trade-ledger'
import BacktestSegmentLegend from '@/components/BacktestSegmentLegend'
import BacktestBlock from '@/components/BacktestBlock'
import { longDateOrdinal } from '@/lib/format-date'
import type { BotSimulation } from '@/lib/bot-simulation'
import SegmentVerdictBadge from '@/components/SegmentVerdictBadge'

/** Recent trades shown on a phone before « Voir les N derniers » (D057). */
const TRADES_MOBILE = 5
/** Trades listed under the curve, the most recent ones. */
const TRADES_SHOWN = 20

interface Props {
  bot: BotWithStats
  /** Backtest + simulation since the freeze, computed once by the page (D072). */
  simulation?: BotSimulation | null
  /** The drawdown's colour from its published limit (audit 2026-10, constat 30). */
  drawdownTone?: DrawdownTone
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

const money = (n: number) => `${frNumber(n, 2)}${NARROW_NBSP}€`
const signTone = (n: number) => (n < 0 ? 'text-negative' : 'text-foreground')

// Refonte « Le registre des décisions », lot 3 (2026-10-02): the body of « Je laisse
// l'addition visible. ». Filters, the figures of what is shown, the curve, then the
// register of closed trades with the cumul after each one, computed on the WHOLE
// history (cumulativeAfterEach), never rebuilt from the rows a filter left. On an engine
// bot the simulation leads and the backtest stays apart, in grey (audit 2026-10,
// constat 4); without a trade nothing is coloured and every figure is « — » (constat 6).
export default function StrategyDetail({ bot, simulation = null, drawdownTone }: Props) {
  const [direction, setDirection] = useState<DirectionFilter>('all')
  const [asset, setAsset] = useState<string>('all')
  const startCapital = bot.start_capital

  // The simulation starts the day after the recipe's dataset ends (D071/D072): its
  // figures, curve and trades come from the timeline, the paper amounts resized on the
  // capital the curve had reached. Everything the top of the fiche counts or filters is
  // the simulation's trades (replay after the freeze + resized ledger), so the counter,
  // the figures and a filtered view never disagree on a bot with replay trades.
  const timeline = simulation?.timeline ?? null
  const segment = simulation?.segment ?? null
  const baseTrades = timeline ? timeline.simTrades : bot.all_trades
  const baseCapital = timeline ? timeline.simStartCapital : startCapital

  const breakdown = useMemo(() => countByDirection(baseTrades), [baseTrades])
  const assetOptions = useMemo(() => assetOptionsFromTrades(baseTrades), [baseTrades])
  const unfiltered = direction === 'all' && asset === 'all'
  // The two-segment curve is the whole bot; a filter draws the simulation's subset alone.
  const sim = unfiltered ? timeline : null
  // The whole history's cumul, from the capital the trades start on.
  const cumul = useMemo(() => cumulativeAfterEach(baseTrades, baseCapital), [baseTrades, baseCapital])

  const stats = useMemo(() => (
    sim
      ? sim.simStats
      : unfiltered
      ? bot.stats
      : computeBotStats(baseTrades, bot.perf_daily, direction, baseCapital, asset)
  ), [baseTrades, bot.perf_daily, bot.stats, direction, asset, baseCapital, unfiltered, sim])

  const equityData = useMemo(() => (
    unfiltered
      ? bot.perf_daily
      : reconstructPerfDaily(filterTrades(baseTrades, direction, asset), baseCapital)
  ), [baseTrades, bot.perf_daily, direction, asset, baseCapital, unfiltered])

  const selection = useMemo(() => (
    unfiltered ? baseTrades : filterTrades(baseTrades, direction, asset)
  ), [baseTrades, direction, asset, unfiltered])
  const tradesShown = useMemo(() => selection.slice(0, TRADES_SHOWN), [selection])

  // Five rows on a phone (D057): twenty took 1 263 px. The choice survives a
  // filter change: a reader who asked for all of them keeps them.
  const [tousSurMobile, setTousSurMobile] = useState(false)
  const limiteMobile = tousSurMobile || tradesShown.length <= TRADES_MOBILE ? undefined : TRADES_MOBILE

  const traded = stats.total_trades > 0
  const filterWords = [
    asset !== 'all' ? asset : null,
    direction === 'long' ? 'longs' : direction === 'short' ? 'shorts' : null,
  ].filter(Boolean).join(' · ')

  // The curve's header gives the result of what it draws: the simulation alone on a
  // segmented curve, the result since the start otherwise, the selection under a filter.
  // The whole curve since 1 January, backtest included, is a grey line apart.
  const headerBase = baseCapital
  const eur = pnlEur(stats.latest_capital, headerBase)
  const pct = pnlPct(stats.latest_capital, headerBase)
  const sinceJanuary = sim ? pnlEur(stats.latest_capital, startCapital) : 0
  const backtestShare = sim ? sim.simStartCapital - startCapital : 0
  const curveLabel = !unfiltered
    ? `Reconstruite sur ${filterWords} uniquement`
    : sim
    ? `Simulation depuis le ${longDateOrdinal(sim.simStart)}`
    : `Depuis le départ, sur ${money(startCapital)}`
  const curveValue = traded ? `${fmtEur(eur)} (${fmtPct(pct)})` : '—'

  // The register's total. Unfiltered, the shown rows end on the cumul of the newest one;
  // under a filter the rows are a selection and its total is not a balance.
  const shownSum = sumOfResults(tradesShown)
  const newestCumul = tradesShown.length > 0 ? cumul.get(tradesShown[0].id) ?? null : null
  const total: TradesTotal | undefined = tradesShown.length === 0 ? undefined : unfiltered
    ? {
      label: tradesShown.length === baseTrades.length
        ? `Total des ${tradesShown.length} trade${tradesShown.length > 1 ? 's' : ''}`
        : `Total de ces ${tradesShown.length} trades`,
      sum: shownSum,
      cumul: newestCumul,
    }
    : { label: 'Total de la sélection', sum: shownSum, cumul: null }
  const before = unfiltered && newestCumul !== null ? newestCumul - shownSum : null

  return (
    <>
      {/* What is counted, and the filters */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm tabular-nums">
              <span className="font-semibold">{`${breakdown.total} trade${breakdown.total > 1 ? 's' : ''} clos`}</span>
              {breakdown.total > 0 && (
                <span className="text-muted">{` · ${breakdown.long} long · ${breakdown.short} short`}</span>
              )}
            </p>
            <AlsoLiveBadge slug={bot.slug} status={bot.status} />
          </div>
          {sim && <p className="text-xs text-muted mt-1">{`Simulation depuis le ${longDateOrdinal(sim.simStart)}`}</p>}
        </div>
        {breakdown.total > 0 && (
          <div className="flex flex-wrap items-end gap-4">
            <AssetFilterSelect options={assetOptions} value={asset} onChange={setAsset} />
            <DirectionFilterPills
              value={direction}
              onChange={setDirection}
              longCount={breakdown.long}
              shortCount={breakdown.short}
            />
          </div>
        )}
      </div>

      {/* Figures of what is shown, recomputed when a filter changes */}
      <div className="mb-8">
        {!unfiltered && <p className="text-xs text-muted mb-2">{`Chiffres de la sélection : ${filterWords}`}</p>}
        <MetricsRow stats={stats} family={bot.family} drawdownTone={unfiltered ? drawdownTone ?? 'neutral' : 'neutral'} />
      </div>

      {/* Curve */}
      <div className="bg-card rounded-lg p-4 sm:p-6 mb-8">
        <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-baseline sm:justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Courbe du cumul
            {sim && segment && <SegmentVerdictBadge verdict={segment.verdict} />}
          </h3>
          <p className="text-sm">
            <span className="text-muted">{`${curveLabel} : `}</span>
            <span data-testid="curve-result" className={`tabular-nums font-semibold ${traded ? signTone(eur) : 'text-muted'}`}>{curveValue}</span>
          </p>
        </div>
        {sim && (
          <p data-testid="curve-backtest" className="text-sm text-muted -mt-2 mb-4">
            {`Depuis ${money(startCapital)} le 1er janvier, backtest compris : ${fmtEur(sinceJanuary)}, dont backtest ${fmtEur(backtestShare)}.`}
          </p>
        )}
        {sim && segment ? (
          <>
            <div role="img" aria-label={`Courbe du capital : backtest du 1er janvier au ${longDateOrdinal(segment.freezeDate)} en pointillé, puis la simulation, jusqu’à ${money(stats.latest_capital)}.`}>
              <EquityCurve data={equityData} startCapital={startCapital}
                segments={sim.rows} freezeDate={segment.freezeDate} tickSize={13} />
            </div>
            <BacktestSegmentLegend freezeDate={segment.freezeDate} simStart={sim.simStart}
              verdict={segment.verdict} paperScaling={segment.paperScaling} />
          </>
        ) : equityData.length > 0 ? (
          // A paper bot without a backtest segment still reads on an axis from 1 January,
          // blank before its launch (D074); filtered views keep their own span.
          <div role="img" aria-label={`Courbe du capital, de ${money(equityData[0].capital)} à ${money(equityData[equityData.length - 1].capital)}.`}>
            <EquityCurve data={equityData} startCapital={startCapital}
              axisFrom={unfiltered && bot.status === 'paper' ? '2026-01-01' : undefined} tickSize={13} />
          </div>
        ) : (
          <p className="text-muted text-sm py-12 text-center">
            {traded || !unfiltered ? 'Aucun trade à afficher pour ce filtre.' : 'Pas encore de courbe : ce bot n’a encore rien tradé.'}
          </p>
        )}
        {bot.status === 'paper' && (
          <p className="text-xs text-muted mt-3">
            Simulation : exécution simulée, aucun capital réel exposé.
          </p>
        )}
      </div>

      {/* Closed trades */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-1">
          {`Trades clos${sim ? ' de la simulation' : ''}`}
          <span className="text-muted text-sm font-normal ml-2">
            {/* The counter says what THIS screen shows: « 5 sur 20 » on a phone
                while folded, « 20 affichés » everywhere else. */}
            {limiteMobile !== undefined && (
              <span className="sm:hidden">{`(${limiteMobile} sur ${tradesShown.length} affichés)`}</span>
            )}
            <span className={limiteMobile !== undefined ? 'hidden sm:inline' : ''}>
              {`(${tradesShown.length} affiché${tradesShown.length > 1 ? 's' : ''}${unfiltered ? '' : `, ${filterWords} uniquement`})`}
            </span>
          </span>
        </h3>
        {tradesShown.length > 0 && <p className="text-sm text-muted mb-3">
          {unfiltered
            ? `${tradesShown.length === baseTrades.length ? 'Tous les trades' : `Les ${tradesShown.length} derniers trades`}, du plus ancien au plus récent.${before !== null ? ` Cumul avant ces trades : ${money(before)}.` : ''}`
            : 'Le cumul de chaque ligne compte tout l’historique, filtre ou non : la sélection n’a pas de solde.'}
        </p>}
        <TradesTable trades={tradesShown} limiteMobile={limiteMobile} cumul={cumul} total={total} />
        {limiteMobile !== undefined && (
          <button
            type="button"
            onClick={() => setTousSurMobile(true)}
            className="sm:hidden mt-4 w-full min-h-11 rounded border border-border-strong px-3 py-2 text-sm text-foreground hover:bg-card-2 transition-colors"
          >
            {`Voir les ${tradesShown.length} derniers`}
          </button>
        )}
      </div>

      {segment && <BacktestBlock segment={segment} />}
    </>
  )
}
