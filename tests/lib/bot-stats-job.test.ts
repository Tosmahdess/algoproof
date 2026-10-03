// tests/lib/bot-stats-job.test.ts
//
// The job behind POST /api/internal/bot-stats (lot 1b, D094). The worst outcome of a
// precomputed table is a row that is wrong and LOOKS right: a valid formula_rev over
// figures computed from the wrong inputs, served until someone notices. Each test below
// is one way that could happen.
import { describe, it, expect } from 'vitest'
import type { Bot, BotWithStats, PerfDaily, Trade } from '@/lib/types'
import type { BacktestSegment } from '@/lib/backtest-segment'
import type { SegmentRead } from '@/lib/backtest-segment-data'
import { computeBotStatsChunk, verifyBotStats, pickSample, JOB_BATCH, type JobDeps, type StoredRow } from '@/lib/bot-stats-job'
import { FORMULA_REV, summarizeBot } from '@/lib/bot-summary'
import { fleetSimulationView } from '@/lib/bot-simulation'

const TODAY = '2026-10-03'

const seg: BacktestSegment = {
  slug: 'arm-a', startDate: '2026-01-01', freezeDate: '2026-08-02', replayEnd: '2026-08-20',
  startCapital: 1000,
  points: [{ date: '2026-01-01', capital: 1000 }, { date: '2026-08-02', capital: 1100 },
    { date: '2026-08-20', capital: 1122 }],
  trades: [{ asset: 'OP-USDT', side: 'short', opened_at: '2026-08-08', closed_at: '2026-08-10',
    entry_price: 1, exit_price: 0.9, reason: 'tp_hit', pnl: 22 }],
}

const perf = (date: string, capital: number): PerfDaily => ({
  id: date, bot_id: 'x', date, capital, pnl_day: 0, win_rate: null, profit_factor: null,
})
const trade = (pnl: number, day: string): Trade => ({
  id: day, bot_id: 'x', opened_at: `${day}T00:00:00Z`, closed_at: `${day}T08:00:00Z`,
  asset: 'ETH-USDT', side: 'long', pnl, reason: null, is_paper: true, entry_price: 1, exit_price: 1,
})

const row = (slug: string): Bot => ({ id: `${slug}-id`, slug, name: slug, status: 'paper',
  start_capital: 1000, last_sync_at: '2026-10-03T13:02:00Z' }) as unknown as Bot

function fleetBot(slug: string): BotWithStats {
  return {
    ...row(slug), perf_daily: [perf('2026-09-01', 1030)], all_trades: [trade(30, '2026-09-01')],
    recent_trades: [], stats: { win_rate: 1, profit_factor: 999, max_drawdown: 0, total_trades: 1,
      latest_capital: 1030 },
  } as unknown as BotWithStats
}

const SLUGS = ['arm-a', 'arm-b', 'arm-c', 'hand-d']

function deps(over: Partial<JobDeps> = {}): JobDeps & { written: unknown[] } {
  const written: unknown[] = []
  return {
    written,
    listBotsPage: async (after, limit) =>
      SLUGS.filter(s => after === null || s > after).slice(0, limit).map(row),
    fetchFleetBot: async slug => fleetBot(slug),
    readSegment: async (slug): Promise<SegmentRead> =>
      slug === 'arm-a' ? { kind: 'ok', segment: seg, sha: 'r:s' } : { kind: 'none' },
    previousStates: async () => new Map(),
    upsert: async rows => { written.push(...rows) },
    ...over,
  }
}

describe('computeBotStatsChunk', () => {
  it('writes one row per bot, at the current formula revision, with where its figures come from', async () => {
    const d = deps()
    const r = await computeBotStatsChunk({ after: null, limit: 10, today: TODAY }, d)
    expect(r.written).toBe(4)
    expect(r.next).toBeNull()
    const a = d.written.find(w => (w as { bot_id: string }).bot_id === 'arm-a-id') as Record<string, unknown>
    expect(a.formula_rev).toBe(FORMULA_REV)
    expect(a.sim_state).toBe('simulation')
    expect(a.segment_sha).toBe('r:s')
    expect(a.computed_for).toBe(TODAY)
    expect(a.source_sync_at).toBe('2026-10-03T13:02:00Z')
    // the figures are exactly the list's: the fleet view summarised
    expect(a.summary).toEqual(summarizeBot(fleetSimulationView(fleetBot('arm-a'), seg, TODAY), TODAY))
    expect(a.total_trades).toBe(2)
    const dRow = d.written.find(w => (w as { bot_id: string }).bot_id === 'hand-d-id') as Record<string, unknown>
    expect(dRow.sim_state).toBe('no_segment')
    expect(dRow.segment_sha).toBeNull()
  })

  it('pages by slug: a cursor to resume from while the page was full', async () => {
    const d = deps()
    const first = await computeBotStatsChunk({ after: null, limit: 2, today: TODAY }, d)
    expect(first.next).toBe('arm-b')
    const second = await computeBotStatsChunk({ after: first.next, limit: 2, today: TODAY }, d)
    expect(second.next).toBe('hand-d')
    const third = await computeBotStatsChunk({ after: second.next, limit: 2, today: TODAY }, d)
    expect(third.processed).toBe(0)
    expect(third.next).toBeNull()
    expect(d.written).toHaveLength(4)
  })

  it('SKIPS a bot whose segment read failed, and keeps its old row (never writes the ledger in its place)', async () => {
    const d = deps({ readSegment: async slug => slug === 'arm-a'
      ? { kind: 'error', reason: 'read failed: timeout' } : { kind: 'none' } })
    const r = await computeBotStatsChunk({ after: null, limit: 10, today: TODAY }, d)
    expect(r.skipped).toEqual([{ slug: 'arm-a', reason: 'segment: read failed: timeout' }])
    expect(d.written.map(w => (w as { bot_id: string }).bot_id)).not.toContain('arm-a-id')
    expect(r.written).toBe(3)
  })

  it('skips a bot whose history fetch fails, and goes on with the others', async () => {
    const d = deps({ fetchFleetBot: async slug => {
      if (slug === 'arm-b') throw new Error('trades fetch failed')
      return fleetBot(slug)
    } })
    const r = await computeBotStatsChunk({ after: null, limit: 10, today: TODAY }, d)
    expect(r.skipped).toEqual([{ slug: 'arm-b', reason: 'fetch: Error: trades fetch failed' }])
    expect(r.written).toBe(3)
  })

  it('skips a bot that is no longer public between the page and its fetch', async () => {
    const d = deps({ fetchFleetBot: async slug => (slug === 'arm-c' ? null : fleetBot(slug)) })
    const r = await computeBotStatsChunk({ after: null, limit: 10, today: TODAY }, d)
    expect(r.skipped).toEqual([{ slug: 'arm-c', reason: 'not public' }])
  })

  it('reports a bot whose figures LEFT the simulation since the last run (it is still written)', async () => {
    const d = deps({
      readSegment: async () => ({ kind: 'none' }),
      previousStates: async () => new Map([['arm-a-id', 'simulation']]),
    })
    const r = await computeBotStatsChunk({ after: null, limit: 10, today: TODAY }, d)
    expect(r.degraded).toEqual([{ slug: 'arm-a', from: 'simulation', to: 'no_segment' }])
    expect(r.written).toBe(4)
  })
})

describe('computeBotStatsChunk writes as it goes (Fable review, 03/10)', () => {
  const many = Array.from({ length: 45 }, (_, i) => `bot-${String(i).padStart(2, '0')}`)
  const listMany: JobDeps['listBotsPage'] = async (after, limit) =>
    many.filter(s => after === null || s > after).slice(0, limit).map(row)

  it('upserts batch by batch: rows computed before a later failure are kept', async () => {
    const batches: number[] = []
    const d = deps({
      listBotsPage: listMany,
      upsert: async rows => {
        if (batches.length === 2) throw new Error('timeout')
        batches.push(rows.length)
      },
    })
    await expect(computeBotStatsChunk({ after: null, limit: 45, today: TODAY }, d)).rejects.toThrow(/timeout/)
    expect(batches).toEqual([JOB_BATCH, JOB_BATCH])
  })

  it('never asks for the previous states of more than one batch at once (URL length)', async () => {
    const asked: number[] = []
    const d = deps({ listBotsPage: listMany, previousStates: async ids => { asked.push(ids.length); return new Map() } })
    const r = await computeBotStatsChunk({ after: null, limit: 45, today: TODAY }, d)
    expect(r.written).toBe(45)
    expect(Math.max(...asked)).toBeLessThanOrEqual(JOB_BATCH)
  })

  it('writes even when the previous states cannot be read (they only feed monitoring)', async () => {
    const d = deps({ previousStates: async () => { throw new Error('read failed') } })
    const r = await computeBotStatsChunk({ after: null, limit: 10, today: TODAY }, d)
    expect(r.written).toBe(4)
    expect(r.notes.join(' ')).toMatch(/previous states unreadable/)
  })
})

describe('verifyBotStats: a stored row against a fresh computation', () => {
  async function stored(slug: string, mutate?: (s: StoredRow) => void): Promise<StoredRow> {
    const d = deps()
    await computeBotStatsChunk({ after: null, limit: 10, today: TODAY }, d)
    const r = structuredClone(d.written.find(w => (w as { bot_id: string }).bot_id === `${slug}-id`)) as StoredRow
    r.slug = slug
    mutate?.(r)
    return r
  }

  it('finds nothing to say about rows that match', async () => {
    const rows = [await stored('arm-a'), await stored('hand-d')]
    const r = await verifyBotStats({ rows, today: TODAY }, deps())
    expect(r.checked).toBe(2)
    expect(r.mismatches).toEqual([])
  })

  it('names a row whose figures differ from what the formula gives today', async () => {
    const rows = [await stored('arm-a', s => {
      (s.summary as { stats: { total_trades: number } }).stats.total_trades = 7
    })]
    const r = await verifyBotStats({ rows, today: TODAY }, deps())
    expect(r.mismatches.map(m => m.slug)).toEqual(['arm-a'])
    expect(r.mismatches[0].fields).toContain('stats')
  })

  it('names a row of another formula revision', async () => {
    const rows = [await stored('hand-d', s => { s.formula_rev = FORMULA_REV - 1 })]
    const r = await verifyBotStats({ rows, today: TODAY }, deps())
    expect(r.mismatches[0].fields).toContain('formula_rev')
  })

  it('does not compare the sparkline of a row computed for another day (its flat tail moved)', async () => {
    const rows = [await stored('hand-d', s => {
      s.computed_for = '2026-10-02'
      ;(s.summary as { spark30: number[] }).spark30 = [1]
    })]
    const r = await verifyBotStats({ rows, today: TODAY }, deps())
    expect(r.mismatches).toEqual([])
  })
})

describe('verification hygiene (Fable review, 03/10)', () => {
  it('puts aside a row the publisher has rewritten since it was computed (not a mismatch)', async () => {
    const d = deps()
    await computeBotStatsChunk({ after: null, limit: 10, today: TODAY }, d)
    const r = structuredClone(d.written.find(w => (w as { bot_id: string }).bot_id === 'arm-a-id')) as StoredRow
    r.slug = 'arm-a'
    ;(r.summary as { stats: { total_trades: number } }).stats.total_trades = 99
    r.last_sync_at = '2026-10-03T15:02:00Z'
    const v = await verifyBotStats({ rows: [r], today: TODAY }, deps())
    expect(v.mismatches).toEqual([])
    expect(v.skipped).toEqual([{ slug: 'arm-a', reason: 'resynced since computed' }])
  })

  it('samples uniformly without replacement', () => {
    const ids = Array.from({ length: 10 }, (_, i) => `id${i}`)
    const counts = new Map<string, number>()
    for (let k = 0; k < 2000; k++) for (const x of pickSample(ids, 3)) counts.set(x, (counts.get(x) ?? 0) + 1)
    expect(pickSample(ids, 3)).toHaveLength(3)
    expect(new Set(pickSample(ids, 10)).size).toBe(10)
    // 2000 draws x 3 / 10 ids = 600 each on average
    for (const n of counts.values()) expect(n).toBeGreaterThan(480)
    for (const n of counts.values()) expect(n).toBeLessThan(720)
  })
})
