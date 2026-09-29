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
  const timeline = buildTimeline(segment, bot.perf_daily, bot.all_trades, bot.start_capital)
  if (!timeline) {
    console.error(`[bot-simulation] ${bot.slug}: segment and ledger disagree, plain view`)
    return null
  }
  return { segment, timeline, stats: timeline.simStats }
}

/** The simulation line alone (freeze day onwards), as a daily series. */
export function simulationPerfDaily(sim: BotSimulation): PerfDaily[] {
  return sim.timeline.rows
    .filter(r => r.paper !== null)
    .map(r => ({ id: r.date, bot_id: sim.segment.slug, date: r.date, capital: r.paper as number,
      pnl_day: 0, win_rate: null, profit_factor: null }))
}
