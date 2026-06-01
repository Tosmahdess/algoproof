import { describe, it, expect, vi, afterEach } from 'vitest'
import { getQuote } from '@/lib/quote-provider'

afterEach(() => vi.restoreAllMocks())

function mockFetch(json: unknown, ok = true) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok, json: async () => json })) as unknown as typeof fetch)
}

describe('getQuote', () => {
  it('parses regularMarketPrice + currency', async () => {
    mockFetch({ chart: { result: [{ meta: { regularMarketPrice: 211.14, currency: 'USD' } }] } })
    const q = await getQuote('NVDA')
    expect(q?.price).toBe(211.14)
    expect(q?.currency).toBe('USD')
    expect(typeof q?.asOf).toBe('string')
  })
  it('returns null on missing price', async () => {
    mockFetch({ chart: { result: [{ meta: {} }] } })
    expect(await getQuote('NVDA')).toBeNull()
  })
  it('returns null on fetch error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('net') }) as unknown as typeof fetch)
    expect(await getQuote('NVDA')).toBeNull()
  })
})
