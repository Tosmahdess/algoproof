// tests/lib/backtest-segment-data.test.ts
//
// D072: a bot's backtest segment is a row of bot_backtest_segments, written by the VPS
// publisher and read here with the service key (no anon policy, like bot_recipes). The
// page draws the plain paper view whenever the row is missing, unreadable or malformed,
// and the row's `meta` (provenance, controls, recipe hash) never leaves the server.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = vi.hoisted(() => ({
  privileged: true,
  rows: null as unknown[] | null,
  error: null as unknown,
  queried: [] as string[],
}))

vi.mock('@/lib/supabase-privileged', () => ({
  supabasePrivileged: () => (state.privileged ? {
    from: (table: string) => ({
      select: () => ({
        eq: (_col: string, slug: string) => ({
          limit: async () => {
            state.queried.push(`${table}:${slug}`)
            return { data: state.rows, error: state.error }
          },
        }),
      }),
    }),
  } : null),
}))

import { getBacktestSegment } from '@/lib/backtest-segment-data'

const payload = {
  startDate: '2026-01-01', freezeDate: '2026-08-02', replayEnd: '2026-08-19',
  startCapital: 1000,
  points: [{ date: '2026-01-01', capital: 1000 }, { date: '2026-08-19', capital: 1121.84 }],
  trades: [{ asset: 'ARB-USDT', side: 'short', opened_at: '2026-06-20', closed_at: '2026-06-23',
    entry_price: 1, exit_price: 0.9, reason: 'tp_hit', pnl: 10.93 }],
  meta: { recipe_sha: 'secret-ish', controls: { paper_checked: 1 } },
}

beforeEach(() => {
  state.privileged = true
  state.rows = [{ payload }]
  state.error = null
  state.queried = []
})

describe('getBacktestSegment', () => {
  it('reads the bot row and hands the page the curve without its meta', async () => {
    const s = await getBacktestSegment('arm-kamacross-d1-head00')
    expect(state.queried).toEqual(['bot_backtest_segments:arm-kamacross-d1-head00'])
    expect(s).toEqual({
      slug: 'arm-kamacross-d1-head00', startDate: '2026-01-01', freezeDate: '2026-08-02',
      replayEnd: '2026-08-19', startCapital: 1000, points: payload.points, trades: payload.trades,
      paperScaling: 'proportional', verdict: null,
    })
    expect(JSON.stringify(s)).not.toContain('secret-ish')
  })

  it('reads a hand-written bot too, with its scaling and verdict (D074)', async () => {
    state.rows = [{ payload: { ...payload, paperScaling: 'additive', verdict: 'rejected' } }]
    const s = await getBacktestSegment('tresor-fdm-d1')
    expect(state.queried).toEqual(['bot_backtest_segments:tresor-fdm-d1'])
    expect(s!.paperScaling).toBe('additive')
    expect(s!.verdict).toBe('rejected')
  })

  it('defaults an absent or unknown scaling and verdict to the engine behaviour', async () => {
    state.rows = [{ payload: { ...payload, paperScaling: 'weird', verdict: 'maybe' } }]
    const s = await getBacktestSegment('arm-x-d1-head00')
    expect(s!.paperScaling).toBe('proportional')
    expect(s!.verdict).toBeNull()
  })

  it('answers null when the row is missing, unreadable or the key is absent', async () => {
    state.rows = []
    expect(await getBacktestSegment('arm-x-d1-head00')).toBeNull()
    state.rows = null; state.error = { message: 'boom' }
    expect(await getBacktestSegment('arm-x-d1-head00')).toBeNull()
    state.privileged = false
    expect(await getBacktestSegment('arm-x-d1-head00')).toBeNull()
  })

  it('answers null for a malformed payload rather than drawing half a curve', async () => {
    for (const bad of [
      { ...payload, points: [] },
      { ...payload, replayEnd: undefined },
      { ...payload, startCapital: '1000' },
      { ...payload, trades: 'x' },
    ]) {
      state.rows = [{ payload: bad }]
      expect(await getBacktestSegment('arm-x-d1-head00')).toBeNull()
    }
  })
})
