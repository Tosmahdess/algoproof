import { describe, it, expect, vi, beforeEach } from 'vitest'

// The query behind the lot 2c score: every trade of a library bot (idea_key set), paged
// past PostgREST's 1 000-row cap in a total order, each with its bot's launch date and
// start capital. Stopped (archived) variants are NOT filtered out: their trades count.
const calls: { select: string; not: unknown[][]; orders: string[]; ranges: [number, number][] }[] = []
let rows: Record<string, unknown>[] = []

function builder() {
  const call = { select: '', not: [] as unknown[][], orders: [] as string[], ranges: [] as [number, number][] }
  calls.push(call)
  let range: [number, number] = [0, 999]
  const b = {
    select: (s: string) => { call.select = s; return b },
    not: (...a: unknown[]) => { call.not.push(a); return b },
    neq: () => { throw new Error('no status filter: stopped variants count') },
    eq: () => b,
    order: (c: string) => { call.orders.push(c); return b },
    range: (f: number, t: number) => { range = [f, t]; call.ranges.push(range); return b },
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: rows.slice(range[0], Math.min(range[1] + 1, range[0] + 1000)), error: null }).then(resolve),
  }
  return b
}

vi.mock('@/lib/supabase', () => ({ supabase: { from: () => builder() } }))
vi.mock('../supabase', () => ({ supabase: { from: () => builder() } }))
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }))

import { fetchScoreRows } from '@/lib/library-score-data'

beforeEach(() => {
  calls.length = 0
  rows = Array.from({ length: 1500 }, (_, i) => ({
    id: `t${String(i).padStart(5, '0')}`, bot_id: `b${i % 7}`, opened_at: '2026-10-01T00:00:00+00:00',
    closed_at: '2026-10-01T04:00:00+00:00', pnl: 1, is_paper: true,
    bots: { slug: i % 7 === 0 ? 'arm-x' : `arm-${i % 7}`, idea_key: 'X|H4', paper_since: null, status: i % 2 ? 'paper' : 'archived' },
  }))
})

describe('fetchScoreRows', () => {
  it('reads every trade of library bots across pages, in a total order', async () => {
    const got = await fetchScoreRows()
    expect(got).toHaveLength(1500)
    expect(calls.length).toBe(2)
    for (const c of calls) {
      expect(c.select).toContain('bots!inner(')
      expect(c.orders).toEqual(['id'])
      expect(c.not).toContainEqual(['bots.idea_key', 'is', null])
    }
  })

  it('flattens the bot fields the score needs, with the start capital', async () => {
    const [r] = await fetchScoreRows()
    expect(r).toEqual({ bot_id: 'b0', idea_key: 'X|H4', start_capital: 1000, is_paper: true, paper_since: null,
      opened_at: '2026-10-01T00:00:00+00:00', closed_at: '2026-10-01T04:00:00+00:00', pnl: 1 })
  })
})
