import { describe, it, expect, vi, beforeEach } from 'vitest'

// PostgREST answers at most 1 000 rows per request (db-max-rows), whatever .limit() asks.
// The fake below enforces the same cap and honours .range(), so a query that does not
// page silently keeps the first 1 000 -- the truncation the library's growth would hit
// once more than 1 000 bots are public (lot 1b, D094).
const CAP = 1000
const calls: { table: string; orders: string[]; ranges: [number, number][]; gt: [string, string] | null; limit: number | null }[] = []
let tables: Record<string, Record<string, unknown>[]> = {}

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
      return Promise.resolve({ data: rows2.slice(from, Math.min(to + 1, from + CAP)), error: null })
        .then(resolve)
    },
  }
  return b
}

vi.mock('@/lib/supabase', () => ({ supabase: { from: (t: string) => builder(t) } }))
vi.mock('../supabase', () => ({ supabase: { from: (t: string) => builder(t) } }))
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }))

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
    tables = { bots: bots.map(b => ({ ...b, bot_stats: { formula_rev: FORMULA_REV,
      computed_at: new Date().toISOString(), computed_for: '2026-10-03', summary } })) }
    const got = await getListBots()
    expect(got).toHaveLength(N)
    expect(got[0].stats.total_trades).toBe(4)
    expect(calls.filter(c => c.table !== 'bots')).toEqual([])
    for (const p of calls) expect(p.orders).toEqual(['name', 'slug'])
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
