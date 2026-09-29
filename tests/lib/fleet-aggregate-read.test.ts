// tests/lib/fleet-aggregate-read.test.ts
//
// Migration 059 (2026-09-29): /overview's fleet totals read every closed trade of every
// non-archived bot in ONE statement (a consistent snapshot) and are no longer cached:
// paged reads caught the publisher mid-rewrite (6 189 trades shown for 6 253), and the
// 30-minute cache entry then stopped refreshing for over 80 minutes, silently.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'

const state = vi.hoisted(() => ({ calls: [] as string[], data: [] as unknown, error: null as unknown }))
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: async (fn: string) => { state.calls.push(fn); return { data: state.data, error: state.error } },
    from: () => { throw new Error('the fleet aggregate must not page through tables') },
  },
}))
vi.mock('next/cache', () => ({ unstable_cache: (fn: (...a: unknown[]) => unknown) => fn }))

import { getAllTradesForAggregate } from '@/lib/queries'

beforeEach(() => { state.calls = []; state.error = null })

describe('getAllTradesForAggregate', () => {
  it('reads the whole fleet in one rpc call', async () => {
    state.data = [{ pnl: 1.5, side: 'long', closed_at: '2026-09-29T20:00:00Z', bot_id: 'b', asset: 'ETH' }]
    const rows = await getAllTradesForAggregate()
    expect(state.calls).toEqual(['fleet_aggregate_trades'])
    expect(rows).toEqual(state.data)
  })

  it('fails loud instead of publishing a partial total', async () => {
    state.error = { message: 'boom' }
    await expect(getAllTradesForAggregate()).rejects.toThrow(/boom/)
  })

  it('is not wrapped in a data cache any more', () => {
    const src = readFileSync('src/lib/queries.ts', 'utf8')
    expect(src).not.toMatch(/\[['"]fleet-trades['"]\]/)
  })
})
