import { describe, it, expect, vi, beforeEach } from 'vitest'

// « 20 derniers trades — tous bots » (/overview). Carry bots micro-rotate dozens of times a
// day: on 2026-10-04, 70 of the 100 newest closed trades were carry, and reading 100 rows
// then filtering in TS served 8 lines instead of 20 (lot 1b, D094). The filter belongs in
// the query. The fake below applies the PostgREST semantics the query relies on, checked
// against prod the same day (inner embed + embedded filters drop the parent row; the
// `or` keeps a bot with no family, as the TS filter did): an unfiltered query returns the
// carry rows, and the feed comes back short.
type Row = { id: number; closed_at: string | null; bots: { family: string | null; status: string } }
let rows: Row[] = []
let failing = false
const seen: { select: string; neq: [string, string][]; or: [string, unknown][]; orders: [string, unknown][]; limit: number | null }[] = []

function builder() {
  const call = { select: '', neq: [] as [string, string][], or: [] as [string, unknown][], orders: [] as [string, unknown][], limit: null as number | null }
  seen.push(call)
  let notNullClosed = false
  const b = {
    select: (s: string) => { call.select = s; return b },
    not: (col: string, op: string, v: unknown) => { if (col === 'closed_at' && op === 'is' && v === null) notNullClosed = true; return b },
    neq: (col: string, v: string) => { call.neq.push([col, v]); return b },
    or: (f: string, opts: unknown) => { call.or.push([f, opts]); return b },
    order: (col: string, opts: unknown) => { call.orders.push([col, opts]); return b },
    limit: (n: number) => { call.limit = n; return b },
    then: (resolve: (v: unknown) => unknown) => {
      if (failing) return Promise.resolve({ data: null, error: { message: 'boom' } }).then(resolve)
      const inner = call.select.includes('bots!inner(')
      let out = rows.filter(r => !notNullClosed || r.closed_at !== null)
      if (inner) {
        for (const [col, v] of call.neq) if (col === 'bots.status') out = out.filter(r => r.bots.status !== v)
        for (const [f, opts] of call.or) {
          if ((opts as { referencedTable?: string })?.referencedTable === 'bots' && f === 'family.is.null,family.neq.carry')
            out = out.filter(r => r.bots.family === null || r.bots.family !== 'carry')
        }
      }
      const keys = call.orders.map(([c, o]) => [c, (o as { ascending?: boolean })?.ascending === false ? -1 : 1] as const)
      out = [...out].sort((x, y) => {
        for (const [c, dir] of keys) {
          const a = (x as unknown as Record<string, string | number>)[c], b2 = (y as unknown as Record<string, string | number>)[c]
          if (a !== b2) return (a < b2 ? -1 : 1) * dir
        }
        return 0
      })
      if (call.limit !== null) out = out.slice(0, call.limit)
      return Promise.resolve({ data: out, error: null }).then(resolve)
    },
  }
  return b
}

vi.mock('@/lib/supabase', () => ({ supabase: { from: () => builder() } }))
vi.mock('../supabase', () => ({ supabase: { from: () => builder() } }))
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }))

import { getRecentTrades } from '@/lib/queries'

const at = (minute: number) => `2026-10-04T10:${String(minute).padStart(2, '0')}:00+00:00`

beforeEach(() => {
  seen.length = 0
  failing = false
  rows = []
  let id = 1
  // the 150 newest trades are carry, then 30 directional ones (newest of those first)
  for (let i = 0; i < 150; i++) rows.push({ id: id++, closed_at: at(59), bots: { family: 'carry', status: 'paper' } })
  for (let i = 0; i < 30; i++) rows.push({ id: id++, closed_at: at(40 - i), bots: { family: 'trend', status: 'paper' } })
})

describe('getRecentTrades filters in the query, so the feed keeps its 20 lines', () => {
  it('serves 20 directional trades even when carry fills the newest hundreds', async () => {
    const got = await getRecentTrades(20)
    expect(got).toHaveLength(20)
    expect(got.every(t => t.bots?.family === 'trend')).toBe(true)
    expect(got[0].closed_at).toBe(at(40))
  })

  it('drops archived bots and keeps a bot without family', async () => {
    rows = [
      { id: 1, closed_at: at(50), bots: { family: 'trend', status: 'archived' } },
      { id: 2, closed_at: at(49), bots: { family: null, status: 'paper' } },
      { id: 3, closed_at: null, bots: { family: 'trend', status: 'paper' } },
    ]
    const got = await getRecentTrades(20)
    expect(got.map(t => t.id)).toEqual([2])
  })

  it('orders ties on closed_at by id, newest first, so the 20 are the same on every read', async () => {
    rows = [
      { id: 7, closed_at: at(30), bots: { family: 'trend', status: 'paper' } },
      { id: 9, closed_at: at(30), bots: { family: 'trend', status: 'paper' } },
      { id: 8, closed_at: at(31), bots: { family: 'trend', status: 'paper' } },
    ]
    const got = await getRecentTrades(2)
    expect(got.map(t => t.id)).toEqual([8, 9])
    expect(seen[0].orders.map(([c]) => c)).toEqual(['closed_at', 'id'])
  })

  it('asks for exactly the lines it serves', async () => {
    await getRecentTrades(20)
    expect(seen[0].limit).toBe(20)
  })

  it('degrades to an empty feed on a read error', async () => {
    failing = true
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await getRecentTrades(20)).toEqual([])
    err.mockRestore()
  })
})
