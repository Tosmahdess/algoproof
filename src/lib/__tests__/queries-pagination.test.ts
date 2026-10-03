import { describe, it, expect, vi, beforeEach } from 'vitest'

// PostgREST answers at most 1 000 rows per request (db-max-rows), whatever .limit() asks.
// The fake below enforces the same cap and honours .range(), so a query that does not
// page silently keeps the first 1 000 -- the truncation the library's growth would hit
// once more than 1 000 bots are public (lot 1b, D094).
const CAP = 1000
const calls: { table: string; orders: string[]; ranges: [number, number][]; gt: [string, string] | null; limit: number | null }[] = []
let tables: Record<string, Record<string, unknown>[]> = {}
const failing = new Set<string>()

function builder(table: string) {
  const call = { table, orders: [] as string[], ranges: [] as [number, number][], gt: null as [string, string] | null, limit: null as number | null }
  calls.push(call)
  let range: [number, number] | null = null
  const b = {
    select: () => b,
    not: () => b,
    eq: () => b,
    gt: (col: string, v: string) => { call.gt = [col, v]; return b },
    order: (col: string) => { call.orders.push(col); return b },
    range: (from: number, to: number) => { range = [from, to]; call.ranges.push(range); return b },
    limit: (n: number) => { call.limit = n; return b },
    single: () => Promise.resolve({ data: (tables[table] ?? [])[0] ?? null, error: null }),
    then: (resolve: (v: unknown) => unknown) => {
      const rows = tables[table] ?? []
      let rows2 = rows
      if (call.gt) { const [col, v] = call.gt; rows2 = rows.filter(r => String(r[col]) > v) }
      if (call.limit !== null && range === null) rows2 = rows2.slice(0, call.limit)
      const [from, to] = range ?? [0, CAP - 1]
      if (failing.has(table)) return Promise.resolve({ data: null, error: { message: `relation "${table}" does not exist` } }).then(resolve)
      return Promise.resolve({ data: rows2.slice(from, Math.min(to + 1, from + CAP)), error: null })
        .then(resolve)
    },
  }
  return b
}

vi.mock('@/lib/supabase', () => ({ supabase: { from: (t: string) => builder(t) } }))
vi.mock('../supabase', () => ({ supabase: { from: (t: string) => builder(t) } }))
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }))
// The live fallback of getListBots: a bot computed live from its (empty) history.
const seg = vi.hoisted(() => ({ read: { kind: 'none' } as { kind: string; reason?: string } }))
vi.mock('@/lib/backtest-segment-data', () => ({
  getBacktestSegment: async () => null,
  readBacktestSegment: async () => seg.read,
}))

import { getBots, getBotSlugs, getListBots, getBotsPage } from '@/lib/queries'
import { FORMULA_REV } from '@/lib/bot-summary'

const N = 2500
const bots = Array.from({ length: N }, (_, i) => ({
  id: `id-${i}`, slug: `arm-bot-${String(i).padStart(5, '0')}`,
  // Names repeat (armada names are shared by design): name alone is not a stable order.
  name: `Bot ${i % 300}`, status: 'paper', family: 'trend',
}))

beforeEach(() => {
  calls.length = 0
  tables = { bots }
})

describe('public bot lists page past the 1 000-row cap', () => {
  it('getBots returns every public bot', async () => {
    const got = await getBots()
    expect(got).toHaveLength(N)
    expect(new Set(got.map(b => b.slug)).size).toBe(N)
  })

  it('getBots pages in an order that is stable across pages (name, then slug)', async () => {
    await getBots()
    const pages = calls.filter(c => c.table === 'bots')
    expect(pages.length).toBeGreaterThan(1)
    for (const p of pages) expect(p.orders).toEqual(['name', 'slug'])
  })

  it('getBotSlugs returns every public slug, ordered by slug', async () => {
    const got = await getBotSlugs()
    expect(got).toHaveLength(N)
    const pages = calls.filter(c => c.table === 'bots')
    for (const p of pages) expect(p.orders).toEqual(['slug'])
  })
})

// Lot 1b (D094): the lists read `bots` with their bot_stats row embedded, in ONE paged
// query, and touch no trade and no daily point when every row is good.
describe('getListBots', () => {
  const stats = { win_rate: 0.5, profit_factor: 1.1, max_drawdown: 0.02, total_trades: 4, latest_capital: 1010 }
  const summary = { stats, slices: { all: stats, long: stats, short: stats },
    sides: { long: true, short: true }, spark30: [1000, 1010], ledgerTail: [] }

  it('returns every public bot past the 1 000-row cap, from the embedded summaries alone', async () => {
    tables = { bots, bot_stats: bots.map(b => ({ bot_id: b.id, formula_rev: FORMULA_REV,
      computed_at: new Date().toISOString(), computed_for: '2026-10-03', summary })) }
    const got = await getListBots()
    expect(got).toHaveLength(N)
    expect(got.every(b => b.stats.total_trades === 4)).toBe(true)
    // nothing but the two tables: no trade, no daily point
    expect([...new Set(calls.map(c => c.table))].sort()).toEqual(['bot_stats', 'bots'])
    for (const p of calls.filter(c => c.table === 'bots')) expect(p.orders).toEqual(['name', 'slug'])
    for (const p of calls.filter(c => c.table === 'bot_stats')) expect(p.orders).toEqual(['bot_id'])
  })

  it('still lists every bot when bot_stats cannot be read (absent table, failed query): computed live', async () => {
    tables = { bots: bots.slice(0, 3) }
    failing.add('bot_stats')
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const got = await getListBots()
      expect(got.map(b => b.slug)).toEqual(bots.slice(0, 3).map(b => b.slug))
      expect(err.mock.calls.flat().join(' ')).toMatch(/bot_stats unreadable/)
    } finally {
      failing.delete('bot_stats')
      err.mockRestore()
    }
  })
})

// The job's cursor: public bots by slug, strictly after the last one done.
describe('getBotsPage', () => {
  it('pages by slug after a cursor', async () => {
    const first = await getBotsPage(null, 3)
    expect(first.map(b => b.slug)).toEqual(['arm-bot-00000', 'arm-bot-00001', 'arm-bot-00002'])
    const next = await getBotsPage('arm-bot-00002', 2)
    expect(next.map(b => b.slug)).toEqual(['arm-bot-00003', 'arm-bot-00004'])
    expect(calls.at(-1)!.orders).toEqual(['slug'])
  })
})

// Fable review (03/10): Next keys unstable_cache on the callback's source and its key parts.
// A formula change does not change the callback's source, and the Vercel data cache outlives
// deploys: without the revision in the key, a bumped formula would serve the OLD formula's
// summaries from the live fallback for up to 30 minutes.
describe('the live fallback cache is keyed by formula revision', () => {
  it('carries FORMULA_REV in its key', async () => {
    const keys: unknown[][] = []
    const cache = await import('next/cache')
    const spy = vi.spyOn(cache, 'unstable_cache').mockImplementation(((fn: unknown, k: unknown[]) => {
      keys.push(k); return fn
    }) as never)
    tables = { bots: bots.slice(0, 1) }
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await getListBots()
    spy.mockRestore()
    const summaryKey = keys.find(k => k[0] === 'fleet-bot-summary')
    expect(summaryKey).toContain(`rev${FORMULA_REV}`)
  })
})

// Fable review (03/10): the live fallback must not cache figures computed from a FAILED
// segment read (they are the ledger's, not the simulation's). It shows the bot the way
// its fiche does in that case (plain paper view), uncached, and says so.
describe('the live fallback on a segment read error', () => {
  it('still lists the bot, says why, and does not go through the cache with those figures', async () => {
    const keys: unknown[][] = []
    const cache = await import('next/cache')
    const spy = vi.spyOn(cache, 'unstable_cache').mockImplementation(((fn: () => Promise<unknown>, k: unknown[]) => {
      keys.push(k)
      // a cache that stores whatever the callback returns: a throw stores nothing
      return async () => fn()
    }) as never)
    tables = { bots: bots.slice(0, 1) }
    seg.read = { kind: 'error', reason: 'read failed: timeout' }
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const got = await getListBots()
      expect(got.map(b => b.slug)).toEqual([bots[0].slug])
      expect(err.mock.calls.flat().join(' ')).toMatch(/segment unreadable.*not cached/)
    } finally {
      seg.read = { kind: 'none' }
      spy.mockRestore(); err.mockRestore()
    }
  })
})
