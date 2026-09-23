import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }))
vi.mock('next/cache', () => ({ unstable_cache: (fn: (...a: unknown[]) => unknown) => fn }))

import { supabase } from '@/lib/supabase'
import { getAllBotsWithStats, getBotWithStats } from '@/lib/queries'

// Measured on 2026-09-23, in a real browser and against the real database.
//
// /overview answers its first byte in 0.23 s and finishes the document in
// 3.5-4.2 s. The gap is server time, and the loading shell hides it: on pages
// without a shell TTFB and total are the same number. Chrome agrees — LCP
// 3871 ms, of which 3806 ms is render delay.
//
// Where it goes: `funding-rate-harvest` carries 5511 trades, and
// `select('*')` on them serialises to 2 112 768 bytes — over the 2 MB ceiling
// of Next's data cache, which then stores NOTHING, silently. So that bot's
// paginated fetch runs again on EVERY request to /, /overview, /strategies and
// the 22 /strategies/[concept] pages. Measured: 1252 ms for the fat select,
// 653 ms for the four columns the fleet actually reads, 520 681 bytes — under
// the ceiling, so the entry finally persists.
//
// queries.ts has been printing a warning naming this bot at every build since
// long before today. The fix it prescribes is this one: slim the projection.
function recordingChain(rows: unknown[], seen: string[]) {
  const terminal = { data: rows, error: null }
  const chain: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(terminal).then(resolve),
    select: vi.fn((cols: string) => { seen.push(cols); return chain }),
    eq: vi.fn(() => chain),
    not: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    range: vi.fn().mockResolvedValue(terminal),
    single: vi.fn().mockResolvedValue(terminal),
  }
  return chain
}

/** Records the `select()` of each table, so a query can be asserted on the
 *  columns it actually asks the database for. */
function spyOnSelects() {
  const byTable: Record<string, string[]> = {}
  vi.mocked(supabase.from).mockImplementation(((table: string) => {
    byTable[table] ??= []
    const rows =
      table === 'bots'
        ? [{ id: 'b1', slug: 'funding-rate-harvest', status: 'paper', family: 'carry' }]
        : []
    return recordingChain(rows, byTable[table]) as never
  }) as never)
  return byTable
}

beforeEach(() => { vi.clearAllMocks() })

describe('what each path asks the database for', () => {
  it('the fleet asks only for the four trade columns it reads', async () => {
    const selects = spyOnSelects()
    await getAllBotsWithStats()

    expect(selects.trades, 'the fleet must not pull whole trade rows').toBeDefined()
    for (const cols of selects.trades!) {
      expect(cols).toBe('side,pnl,asset,closed_at')
    }
  })

  // The fiche renders a trade table with entry/exit prices and reasons, so it
  // genuinely needs whole rows. It is fetched by slug and NOT through the
  // cached fleet entry, which is what makes the two projections independent.
  it('the bot fiche still asks for whole trade rows', async () => {
    const selects = spyOnSelects()
    await getBotWithStats('funding-rate-harvest')

    expect(selects.trades).toContain('*')
  })
})
