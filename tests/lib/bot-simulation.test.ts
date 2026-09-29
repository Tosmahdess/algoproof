// tests/lib/bot-simulation.test.ts
//
// D072: on an engine bot with a backtest segment, every figure of the fiche that says
// « simulation » counts from the day after the freeze: the tiles, the zero-trade note,
// the path-to-real card, the page description and its OG image. One helper answers for
// all of them, so they cannot drift apart (28 of the 75 wave bots have replay trades
// between the freeze and the launch, which the ledger does not hold).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { BotWithStats, PerfDaily, Trade } from '@/lib/types'
import type { BacktestSegment } from '@/lib/backtest-segment'

const state = vi.hoisted(() => ({ segment: null as unknown }))
vi.mock('@/lib/backtest-segment-data', () => ({
  getBacktestSegment: async () => state.segment,
}))

import { getBotSimulation, simulationPerfDaily } from '@/lib/bot-simulation'

const seg: BacktestSegment = {
  slug: 'arm-t', startDate: '2026-01-01', freezeDate: '2026-08-02', replayEnd: '2026-08-20',
  startCapital: 1000,
  points: [{ date: '2026-01-01', capital: 1000 }, { date: '2026-08-02', capital: 1100 },
    { date: '2026-08-10', capital: 1122 }, { date: '2026-08-20', capital: 1122 }],
  trades: [
    { asset: 'ETH-USDT', side: 'long', opened_at: '2026-03-01', closed_at: '2026-03-02',
      entry_price: 1, exit_price: 1.1, reason: 'tp_hit', pnl: 100 },
    // a bridge trade: after the freeze, before the launch, not in the ledger
    { asset: 'OP-USDT', side: 'short', opened_at: '2026-08-08', closed_at: '2026-08-10',
      entry_price: 1, exit_price: 0.9, reason: 'tp_hit', pnl: 22 },
  ],
}

const bot = (trades: Trade[], perf: PerfDaily[]) => ({
  slug: 'arm-t', start_capital: 1000, all_trades: trades, perf_daily: perf,
  stats: { win_rate: 0, profit_factor: 0, max_drawdown: 0, total_trades: trades.length,
    latest_capital: 1000 },
}) as unknown as BotWithStats

beforeEach(() => { state.segment = seg })

describe('getBotSimulation', () => {
  it('counts the bridge trade in the simulation even when the ledger is still empty', async () => {
    const sim = await getBotSimulation(bot([], []))
    expect(sim!.timeline.simStats.total_trades).toBe(1)
    expect(sim!.timeline.simStart).toBe('2026-08-03')
    // the ledger alone would say 0 trades: the fiche must not
    expect(sim!.stats.total_trades).toBe(1)
  })

  it('is null for a bot without a segment, and the fiche keeps the ledger figures', async () => {
    state.segment = null
    expect(await getBotSimulation(bot([], []))).toBeNull()
  })

  it('is null when the segment and the ledger disagree (never half a curve)', async () => {
    const early: PerfDaily = { id: 'x', bot_id: 'arm-t', date: '2026-08-15', capital: 990,
      pnl_day: -10, win_rate: null, profit_factor: null }
    expect(await getBotSimulation(bot([], [early]))).toBeNull()
  })
})

describe('simulationPerfDaily', () => {
  it('is the simulation line alone, from the freeze, for a sparkline', async () => {
    const sim = (await getBotSimulation(bot([], [])))!
    const p = simulationPerfDaily(sim)
    expect(p[0].date).toBe('2026-08-02')
    expect(p[0].capital).toBe(1100)
    expect(p.at(-1)!.capital).toBe(1122)
  })
})
