import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
vi.mock('@/lib/supabase-server', () => ({ supabaseServer: { from: (...a: unknown[]) => mockFrom(...a) } }))

import { getLatestFiche, getCoveredFiches, getGrowthRow, getAllFiches } from '@/lib/equity'

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

describe('getAllFiches (widened index)', () => {
  it('returns freshness fields and keeps latest thesis_version per ticker', async () => {
    mockFrom.mockReturnValue(chain([
      { ticker: 'NVDA', asset_name: 'NVIDIA', category: 'semi', verdict: 'renforcer',
        thesis_version: 3, generated_at: '2026-07-03T08:00:00Z',
        verdict_reason: 'Le moat CUDA tient.', price_at_generation: 120.5, ticker_yf: 'NVDA' },
      { ticker: 'NVDA', asset_name: 'NVIDIA', category: 'semi', verdict: 'maintenir',
        thesis_version: 2, generated_at: '2026-06-01T08:00:00Z',
        verdict_reason: 'old', price_at_generation: 100, ticker_yf: 'NVDA' },
    ]))
    const out = await getAllFiches()
    expect(out).toHaveLength(1)
    expect(out[0].generated_at).toBe('2026-07-03T08:00:00Z')
    expect(out[0].verdict_reason).toBe('Le moat CUDA tient.')
    expect(out[0].ticker_yf).toBe('NVDA')
  })
})
