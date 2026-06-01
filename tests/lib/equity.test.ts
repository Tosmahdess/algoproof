import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
vi.mock('@/lib/supabase-server', () => ({ supabaseServer: { from: (...a: unknown[]) => mockFrom(...a) } }))

import { getLatestFiche, getCoveredFiches, getGrowthRow } from '@/lib/equity'

// helper to build a chainable thenable returning {data,error}
function chain(result: unknown) {
  const p = Promise.resolve({ data: result, error: null })
  const obj: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'order', 'limit']) obj[m] = () => obj
  return Object.assign(obj, { then: p.then.bind(p) })
}

beforeEach(() => mockFrom.mockReset())

describe('getLatestFiche', () => {
  it('returns the single latest fiche row or null', async () => {
    mockFrom.mockReturnValue(chain([{ ticker: 'NVDA', verdict: 'renforcer' }]))
    expect((await getLatestFiche('NVDA'))?.verdict).toBe('renforcer')
    mockFrom.mockReturnValue(chain([]))
    expect(await getLatestFiche('ZZZ')).toBeNull()
  })
})

describe('getCoveredFiches', () => {
  it('returns the list of covered tickers with verdict', async () => {
    mockFrom.mockReturnValue(chain([{ ticker: 'NVDA', verdict: 'renforcer', generated_at: 'x' }]))
    const out = await getCoveredFiches()
    expect(out[0].ticker).toBe('NVDA')
  })
})
