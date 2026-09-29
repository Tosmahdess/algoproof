// src/lib/bot-simulation.ts
//
// The ONE answer to « what does this engine bot's fiche call its simulation? » (D072).
// With a backtest segment, the simulation starts the day after the freeze of the recipe's
// dataset: replay trades between the freeze and the launch (28 of the 75 wave bots have
// some) plus the paper ledger, resized on the capital the curve had reached. The tiles,
// the zero-trade note, the path-to-real card, the page description and the OG image all
// read `stats` from here, so none of them can fall back to the ledger alone while another
// shows the simulation. The fleet register keeps the ledger (it serves 96 bots client
// side) and says so.
//
// Null when the bot has no segment or the segment and the ledger disagree: every
// consumer then keeps bot.stats, the plain paper view.
import type { BotStats, BotWithStats, PerfDaily } from '@/lib/types'
import { buildTimeline, type BacktestSegment, type Timeline } from '@/lib/backtest-segment'
import { getBacktestSegment } from '@/lib/backtest-segment-data'

export type BotSimulation = {
  segment: BacktestSegment
  timeline: Timeline
  /** Simulation figures since the freeze: what every « simulation » number shows. */
  stats: BotStats
}

export async function getBotSimulation(bot: BotWithStats): Promise<BotSimulation | null> {
  const segment = await getBacktestSegment(bot.slug)
  if (!segment) return null
  const today = new Date().toISOString().slice(0, 10)
  const timeline = buildTimeline(segment, bot.perf_daily, bot.all_trades, bot.start_capital, today)
  if (!timeline) {
    console.error(`[bot-simulation] ${bot.slug}: segment and ledger disagree, plain view`)
    return null
  }
  return { segment, timeline, stats: timeline.simStats }
}

/** The simulation line alone (freeze day onwards), as a daily series. */
export function simulationPerfDaily(sim: BotSimulation): PerfDaily[] {
  return simulationRows(sim.timeline, sim.segment.slug)
}

function simulationRows(timeline: Timeline, slug: string): PerfDaily[] {
  return timeline.rows
    .filter(r => r.paper !== null)
    .map(r => ({ id: r.date, bot_id: slug, date: r.date, capital: r.paper as number,
      pnl_day: 0, win_rate: null, profit_factor: null }))
}

/** The FLEET view of an engine bot (lists: /overview, register, strategy pages, D073):
 *  the same simulation since the freeze as its fiche (trade count, WR, PF, DD, return),
 *  read on the 1 000 EUR base the lists show every bot on. Amounts are divided by the
 *  capital the simulation started from over the start capital, so a list's P&L is « per
 *  1 000 EUR » while the fiche's is on the curve's own level; the percentage is the same.
 *
 *  perf_daily and start_capital are NOT touched: the fleet's P&L totals and its
 *  simulation line are built from them (and from raw trades) and must stay the paper as
 *  executed, without replayed trades or the backtest's scale (R1). Returns the bot as is
 *  when it has no segment or its segment disagrees with the ledger. */
export function fleetSimulationView(bot: BotWithStats, segment: BacktestSegment | null,
  today: string): BotWithStats {
  if (!segment) return bot
  const timeline = buildTimeline(segment, bot.perf_daily, bot.all_trades, bot.start_capital, today)
  if (!timeline) return bot
  // A fixed-notional bot's amounts are already on its own base (D074): no rescale.
  const k = segment.paperScaling === 'additive' ? 1 : bot.start_capital / timeline.simStartCapital
  const trades = timeline.simTrades.map(t => ({ ...t, pnl: t.pnl * k }))
  const s = timeline.simStats
  return {
    ...bot,
    stats: { ...s, latest_capital: s.latest_capital * k },
    all_trades: trades,
    recent_trades: trades.slice(0, 20),
    list_perf_daily: simulationRows(timeline, bot.slug).map(p => ({ ...p, capital: p.capital * k })),
  }
}
