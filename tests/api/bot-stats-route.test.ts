// tests/api/bot-stats-route.test.ts
//
// POST /api/internal/bot-stats (lot 1b, D094): the only writer of bot_stats. Public URL,
// so it must refuse without its secret, and refuse to run at all without the service key
// (without it every segment read fails: the job would skip every engine bot, or worse,
// a careless version would write them all as « no segment »).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const db = vi.hoisted(() => ({
  privileged: true,
  upserts: [] as { rows: Record<string, unknown>[]; opts: unknown }[],
  stored: [] as Record<string, unknown>[],
  pageCalls: [] as [string | null, number][],
}))

vi.mock('@/lib/supabase-privileged', () => ({
  supabasePrivileged: () => (db.privileged ? {
    from: () => ({
      upsert: async (rows: Record<string, unknown>[], opts: unknown) => {
        db.upserts.push({ rows, opts }); return { error: null }
      },
      select: () => ({
        in: async () => ({ data: [], error: null }),
        order: () => ({ range: async () => ({ data: db.stored, error: null }) }),
      }),
    }),
  } : null),
}))

vi.mock('@/lib/queries', () => ({
  getBotsPage: async (after: string | null, limit: number) => {
    db.pageCalls.push([after, limit])
    return after === null
      ? [{ id: 'a-id', slug: 'a', name: 'a', status: 'paper', start_capital: 1000, last_sync_at: null }]
      : []
  },
  fetchFleetBot: async (slug: string) => ({
    id: `${slug}-id`, slug, name: slug, status: 'paper', start_capital: 1000, last_sync_at: null,
    perf_daily: [], all_trades: [], recent_trades: [],
    stats: { win_rate: 0, profit_factor: 0, max_drawdown: 0, total_trades: 0, latest_capital: 1000 },
  }),
}))

vi.mock('@/lib/backtest-segment-data', () => ({
  readBacktestSegment: async () => ({ kind: 'none' }),
  getBacktestSegment: async () => null,
}))

import { POST } from '@/app/api/internal/bot-stats/route'

const req = (query = '', secret: string | null = 's3cret') => new Request(
  `https://algoproof.fr/api/internal/bot-stats${query}`,
  { method: 'POST', headers: secret === null ? {} : { 'x-bot-stats-secret': secret } },
)

beforeEach(() => {
  db.privileged = true
  db.upserts = []
  db.stored = []
  db.pageCalls = []
  vi.stubEnv('BOT_STATS_SECRET', 's3cret')
})
afterEach(() => vi.unstubAllEnvs())

describe('POST /api/internal/bot-stats', () => {
  it('refuses everything while no secret is configured', async () => {
    vi.stubEnv('BOT_STATS_SECRET', '')
    const res = await POST(req())
    expect(res.status).toBe(503)
    expect(db.upserts).toEqual([])
  })

  it('refuses a missing or wrong secret', async () => {
    expect((await POST(req('', null))).status).toBe(401)
    expect((await POST(req('', 'nope'))).status).toBe(401)
    expect(db.upserts).toEqual([])
  })

  it('refuses to run without the service key, and writes nothing', async () => {
    db.privileged = false
    const res = await POST(req())
    expect(res.status).toBe(500)
    expect(db.upserts).toEqual([])
  })

  it('computes a page, upserts it by bot id, and answers the cursor', async () => {
    const res = await POST(req('?limit=1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ processed: 1, written: 1, skipped: [], next: 'a' })
    expect(db.upserts).toHaveLength(1)
    expect(db.upserts[0].opts).toEqual({ onConflict: 'bot_id' })
    expect(db.upserts[0].rows[0]).toMatchObject({ bot_id: 'a-id', sim_state: 'no_segment' })
    expect(typeof db.upserts[0].rows[0].computed_at).toBe('string')
  })

  it('passes the cursor on and caps the page size', async () => {
    await POST(req('?after=a&limit=5000'))
    expect(db.pageCalls).toEqual([['a', 200]])
  })

  it('verify mode recomputes stored rows and writes nothing', async () => {
    db.stored = [{ bot_id: 'a-id', formula_rev: -1, computed_for: '2000-01-01', sim_state: 'no_segment',
      segment_sha: null, start_capital: 1000, total_trades: 0, source_sync_at: null,
      summary: {}, bots: { slug: 'a' } }]
    const res = await POST(req('?verify=1&sample=5'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.checked).toBe(1)
    expect(body.mismatches[0].slug).toBe('a')
    expect(body.mismatches[0].fields).toContain('formula_rev')
    expect(db.upserts).toEqual([])
  })
})
