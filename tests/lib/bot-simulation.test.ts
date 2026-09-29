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

// --- Lists (D073): /overview, fleet register, strategy pages ---------------------------
import { fleetSimulationView } from '@/lib/bot-simulation'

describe('fleetSimulationView', () => {
  const ledgerTrade = (pnl: number, day: string): Trade => ({
    id: day, bot_id: 'arm-t', opened_at: `${day}T00:00:00+00:00`,
    closed_at: `${day}T08:00:00+00:00`, asset: 'ETH-USDT', side: 'long', pnl,
    reason: null, is_paper: true, entry_price: 1, exit_price: 1,
  })
  const perfRow = (date: string, capital: number): PerfDaily => ({
    id: date, bot_id: 'arm-t', date, capital, pnl_day: 0, win_rate: null, profit_factor: null,
  })

  it('counts what the fiche counts, on the 1 000 EUR base the lists use', () => {
    const b = bot([ledgerTrade(11, '2026-09-01')], [perfRow('2026-09-01', 1011)])
    const v = fleetSimulationView(b, seg, '2026-09-02')
    // the bridge trade (22 on the curve at 1100) + the ledger trade
    expect(v.stats.total_trades).toBe(2)
    expect(v.all_trades.length).toBe(2)
    // curve: 1100 at the freeze -> 1122 after the bridge -> +11 x 1.122 on the ledger
    // simulation return = (1122 + 12.34) / 1100 - 1; the list reads it on 1000
    const simLatest = 1122 + Math.round(11 * 1.122 * 100) / 100
    expect(v.stats.latest_capital).toBeCloseTo(1000 * simLatest / 1100, 6)
    // amounts rescaled to the 1000 base: the bridge trade is 22 on 1100 -> 20 on 1000
    expect(v.all_trades.map(t => Math.round(t.pnl * 100) / 100).sort()).toEqual(
      [Math.round(11 * 1.122 * 1000 / 1100 * 100) / 100, 20].sort())
    // the fleet's P&L line and totals keep the ledger: never the replay, never the scale
    expect(v.perf_daily).toBe(b.perf_daily)
    expect(v.start_capital).toBe(1000)
  })

  it('leaves a bot without a segment, or whose segment disagrees, untouched', () => {
    const b = bot([], [])
    expect(fleetSimulationView(b, null, '2026-09-02')).toBe(b)
    const early = perfRow('2026-08-15', 990)
    const bad = bot([], [early])
    expect(fleetSimulationView(bad, seg, '2026-09-02')).toBe(bad)
  })
})
