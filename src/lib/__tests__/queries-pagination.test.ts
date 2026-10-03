import { describe, it, expect, vi, beforeEach } from 'vitest'

// PostgREST answers at most 1 000 rows per request (db-max-rows), whatever .limit() asks.
// The fake below enforces the same cap and honours .range(), so a query that does not
// page silently keeps the first 1 000 -- the truncation the library's growth would hit
// once more than 1 000 bots are public (lot 1b, D094).
const CAP = 1000
const calls: { table: string; orders: string[]; ranges: [number, number][] }[] = []
let tables: Record<string, Record<string, unknown>[]> = {}

function builder(table: string) {
  const call = { table, orders: [] as string[], ranges: [] as [number, number][] }
  calls.push(call)
  let range: [number, number] | null = null
  const b = {
    select: () => b,
    not: () => b,
    eq: () => b,
    order: (col: string) => { call.orders.push(col); return b },
    range: (from: number, to: number) => { range = [from, to]; call.ranges.push(range); return b },
    limit: () => b,
    single: () => Promise.resolve({ data: (tables[table] ?? [])[0] ?? null, error: null }),
    then: (resolve: (v: unknown) => unknown) => {
      const rows = tables[table] ?? []
      const [from, to] = range ?? [0, CAP - 1]
      return Promise.resolve({ data: rows.slice(from, Math.min(to + 1, from + CAP)), error: null })
        .then(resolve)
    },
  }
  return b
}

vi.mock('@/lib/supabase', () => ({ supabase: { from: (t: string) => builder(t) } }))
vi.mock('../supabase', () => ({ supabase: { from: (t: string) => builder(t) } }))
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }))

import { getBots, getBotSlugs } from '@/lib/queries'

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
