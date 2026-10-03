// tests/lib/bot-summary.test.ts
//
// Lot 1b (D094): what a list shows for a bot is computed ONCE per publisher pass by the
// site itself and stored in bot_stats. The summary is built by the very functions the
// lists ran on every render (fleetSimulationView, registerSlices, last30Capital), and a
// list falls back to computing it live with the same function, so a row and a live
// render cannot disagree by construction. What these tests pin is everything AROUND
// that: the jsonb round trip, the ledger window the fleet curves need, the state that
// says whether the figures are the simulation, and the shape check on the way back.
import { describe, it, expect } from 'vitest'
import type { BotWithStats, PerfDaily, Trade } from '@/lib/types'
import type { BacktestSegment } from '@/lib/backtest-segment'
import { fleetSimulationView } from '@/lib/bot-simulation'
import { registerSlices } from '@/lib/register-slices'
import { last30Capital } from '@/lib/home-data'
import {
  summarizeBot, simStateOf, parseSummary, LEDGER_TAIL_DAYS,
} from '@/lib/bot-summary'

const TODAY = '2026-10-03'

const seg: BacktestSegment = {
  slug: 'arm-t', startDate: '2026-01-01', freezeDate: '2026-08-02', replayEnd: '2026-08-20',
  startCapital: 1000,
  points: [{ date: '2026-01-01', capital: 1000 }, { date: '2026-08-02', capital: 1100 },
    { date: '2026-08-10', capital: 1122 }, { date: '2026-08-20', capital: 1122 }],
  trades: [
    { asset: 'ETH-USDT', side: 'long', opened_at: '2026-03-01', closed_at: '2026-03-02',
      entry_price: 1, exit_price: 1.1, reason: 'tp_hit', pnl: 100 },
    { asset: 'OP-USDT', side: 'short', opened_at: '2026-08-08', closed_at: '2026-08-10',
      entry_price: 1, exit_price: 0.9, reason: 'tp_hit', pnl: 22 },
  ],
}

const trade = (pnl: number, day: string, side: 'long' | 'short' = 'long', asset = 'ETH-USDT'): Trade => ({
  id: day + side + pnl, bot_id: 'b', opened_at: `${day}T00:00:00+00:00`,
  closed_at: `${day}T08:00:00+00:00`, asset, side, pnl,
  reason: null, is_paper: true, entry_price: 1, exit_price: 1,
})
const perf = (date: string, capital: number): PerfDaily => ({
  id: date, bot_id: 'b', date, capital, pnl_day: 0, win_rate: null, profit_factor: null,
})

/** A bot as fetchBotWithStats hands it over (ledger figures). */
function rawBot(slug: string, trades: Trade[], daily: PerfDaily[], start = 1000): BotWithStats {
  const wins = trades.filter(t => t.pnl > 0)
  const gp = wins.reduce((s, t) => s + t.pnl, 0)
  const gl = Math.abs(trades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0))
  return {
    id: slug + '-id', slug, name: slug, status: 'paper', start_capital: start,
    stats: {
      win_rate: trades.length ? wins.length / trades.length : 0,
      profit_factor: gl > 0 ? gp / gl : gp > 0 ? 999 : 0,
      max_drawdown: 0, total_trades: trades.length,
      latest_capital: daily.at(-1)?.capital ?? start + trades.reduce((s, t) => s + t.pnl, 0),
    },
    perf_daily: daily, all_trades: trades, recent_trades: trades.slice(0, 20),
  } as unknown as BotWithStats
}

const engineTrades = [trade(30, '2026-09-01'), trade(-10, '2026-09-10', 'short', 'SOL-USDT')]
const engineDaily = [perf('2026-09-01', 1030), perf('2026-09-10', 1020)]

const FIXTURES: { name: string; bot: BotWithStats; segment: BacktestSegment | null }[] = [
  { name: 'engine bot with a segment', bot: rawBot('arm-t', engineTrades, engineDaily), segment: seg },
  { name: 'additive segment', bot: rawBot('arm-t', engineTrades, engineDaily),
    segment: { ...seg, paperScaling: 'additive' } },
  { name: 'segment that disagrees with the ledger', segment: seg,
    bot: rawBot('arm-t', engineTrades, [perf('2026-08-15', 990), ...engineDaily]) },
  { name: 'hand-written bot without a segment', segment: null,
    bot: rawBot('emacross-bf7-x10', [trade(5, '2026-05-01'), trade(-2, '2026-07-01', 'short')],
      [perf('2026-05-01', 1005), perf('2026-07-01', 1003)]) },
  { name: 'zero trades', segment: null, bot: rawBot('arm-empty', [], []) },
  { name: 'carry bot: trades, no perf_daily', segment: null,
    bot: rawBot('funding-rate-harvest', [trade(1.5, '2026-09-30'), trade(2, '2026-10-01')], [], 400) },
]

describe('summarizeBot is the list path, composed once', () => {
  for (const f of FIXTURES) {
    it(`${f.name}: the figures the register used to compute on every render`, () => {
      const view = fleetSimulationView(f.bot, f.segment, TODAY)
      const s = summarizeBot(view, TODAY)
      const old = registerSlices(view, [])
      expect(s.stats).toEqual(view.stats)
      expect(s.slices).toEqual(old.slices)
      expect(s.sides).toEqual(old.sides)
      expect(s.spark30).toEqual(last30Capital(view.list_perf_daily ?? view.perf_daily))
    })

    it(`${f.name}: survives the jsonb round trip unchanged`, () => {
      const s = summarizeBot(fleetSimulationView(f.bot, f.segment, TODAY), TODAY)
      const back = parseSummary(JSON.parse(JSON.stringify(s)))
      expect(back).toEqual(s)
    })
  }

  it('an engine bot reads its SIMULATION, not its ledger (D073)', () => {
    const raw = FIXTURES[0].bot
    const s = summarizeBot(fleetSimulationView(raw, seg, TODAY), TODAY)
    // the bridge trade of the replay counts: 1 replay + 2 ledger trades
    expect(s.stats.total_trades).toBe(3)
    expect(raw.stats.total_trades).toBe(2)
  })
})

describe('the ledger tail feeds the fleet curves, which read the LEDGER', () => {
  const daily = [perf('2026-06-01', 1001), perf('2026-07-15', 1010), perf('2026-08-20', 1020),
    perf('2026-08-28', 1025), perf('2026-09-02', 1030), perf('2026-10-02', 1040)]
  const s = summarizeBot(fleetSimulationView(rawBot('emacross-bf7-x10', [], daily), null, TODAY), TODAY)

  it(`keeps every point of the last ${LEDGER_TAIL_DAYS} days, from the ledger`, () => {
    expect(s.ledgerTail.map(p => p.date)).toContain('2026-09-02')
    expect(s.ledgerTail.map(p => p.date)).toContain('2026-10-02')
  })

  it('plus the last point BEFORE the window: the fleet total carries it forward', () => {
    // 35 days before 2026-10-03 is 2026-08-29: 2026-08-28 is the carried point.
    expect(s.ledgerTail[0]).toEqual({ date: '2026-08-28', capital: 1025 })
    expect(s.ledgerTail.map(p => p.date)).not.toContain('2026-08-20')
  })

  it('is the ledger even for an engine bot whose figures are the simulation', () => {
    const e = summarizeBot(fleetSimulationView(FIXTURES[0].bot, seg, TODAY), TODAY)
    expect(e.ledgerTail).toEqual(engineDaily.map(p => ({ date: p.date, capital: p.capital })))
  })
})

describe('simStateOf says where the figures come from', () => {
  it('« simulation » when the segment was applied', () => {
    const raw = FIXTURES[0].bot
    expect(simStateOf('ok', raw, fleetSimulationView(raw, seg, TODAY))).toBe('simulation')
  })
  it('« ledger » when a segment exists but disagrees with the ledger', () => {
    const raw = FIXTURES[2].bot
    expect(simStateOf('ok', raw, fleetSimulationView(raw, seg, TODAY))).toBe('ledger')
  })
  it('« no_segment » for a bot without one', () => {
    const raw = FIXTURES[3].bot
    expect(simStateOf('none', raw, fleetSimulationView(raw, null, TODAY))).toBe('no_segment')
  })
})

describe('summarizeBot refuses what jsonb would silently change', () => {
  it('throws on a non-finite figure (JSON writes NaN and Infinity as null)', () => {
    const raw = rawBot('emacross-bf7-x10', [], [])
    const bad = { ...raw, stats: { ...raw.stats, profit_factor: Number.POSITIVE_INFINITY } }
    expect(() => summarizeBot(bad, TODAY)).toThrow(/finite/)
  })
})

describe('parseSummary rejects a row it cannot trust', () => {
  const good = summarizeBot(fleetSimulationView(FIXTURES[3].bot, null, TODAY), TODAY)
  it('null for a missing field', () => {
    const { slices: _drop, ...rest } = good
    expect(parseSummary(rest)).toBeNull()
  })
  it('null for a figure that is not a number', () => {
    expect(parseSummary({ ...good, stats: { ...good.stats, win_rate: null } })).toBeNull()
  })
  it('null for anything that is not an object', () => {
    expect(parseSummary(null)).toBeNull()
    expect(parseSummary('x')).toBeNull()
  })
})
