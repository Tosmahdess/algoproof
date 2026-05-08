// tests/lib/queries.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase'
import { getBots, getBotSlugs, getTriggerData } from '@/lib/queries'

const mockChain = (data: unknown, error: unknown = null) => {
  const terminal = { data, error }
  // The chain is itself a thenable so that awaiting it (without .order()/.single()) resolves correctly.
  // Methods that keep the chain return `this`; terminal methods resolve with the data.
  const chain: any = {
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(terminal).then(resolve),
    select: vi.fn().mockReturnThis(),
    neq:    vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    order:  vi.fn().mockResolvedValue(terminal),
    single: vi.fn().mockResolvedValue(terminal),
  }
  return chain
}

describe('getBots', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns empty array when no bots', async () => {
    vi.mocked(supabase.from).mockReturnValue(mockChain([]))
    const result = await getBots()
    expect(result).toEqual([])
  })

  it('returns bots array when data exists', async () => {
    const mockBots = [{ id: '1', slug: 'v1-spot', name: 'Bot V1', strategy: 'EMA', status: 'paper', exchange: 'Binance', assets: ['BTC/USDT'], timeframe: 'H4', description: null }]
    vi.mocked(supabase.from).mockReturnValue(mockChain(mockBots))
    const result = await getBots()
    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('v1-spot')
  })

  it('throws on Supabase error', async () => {
    vi.mocked(supabase.from).mockReturnValue(mockChain(null, { message: 'db error' }))
    await expect(getBots()).rejects.toThrow('db error')
  })
})

describe('getBotSlugs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns slug array from data', async () => {
    vi.mocked(supabase.from).mockReturnValue(mockChain([{ slug: 'v1-spot' }, { slug: 'v1-hl' }]))
    const result = await getBotSlugs()
    expect(result).toEqual(['v1-spot', 'v1-hl'])
  })

  it('returns empty array when no data', async () => {
    vi.mocked(supabase.from).mockReturnValue(mockChain([]))
    const result = await getBotSlugs()
    expect(result).toEqual([])
  })

  it('throws on Supabase error', async () => {
    vi.mocked(supabase.from).mockReturnValue(mockChain(null, { message: 'slugs error' }))
    await expect(getBotSlugs()).rejects.toThrow('slugs error')
  })
})

describe('getTriggerData', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns null when bot not found', async () => {
    vi.mocked(supabase.from).mockReturnValue(mockChain(null, { message: 'not found' }))
    const result = await getTriggerData('unknown-slug')
    expect(result).toBeNull()
  })

  it('returns zeros when no live trades', async () => {
    const botChain = mockChain({ id: 'bot-1', status: 'live' })
    const tradesChain = mockChain([])
    vi.mocked(supabase.from)
      .mockReturnValueOnce(botChain)
      .mockReturnValueOnce(tradesChain)
    const result = await getTriggerData('v1-spot')
    expect(result).toEqual({ profitFactor: 0, totalTrades: 0, isLive: true })
  })

  it('calculates profitFactor and totalTrades from live trades', async () => {
    const botChain = mockChain({ id: 'bot-1', status: 'live' })
    const tradesChain = mockChain([
      { pnl: 10 }, { pnl: 5 }, { pnl: -3 },
    ])
    vi.mocked(supabase.from)
      .mockReturnValueOnce(botChain)
      .mockReturnValueOnce(tradesChain)
    const result = await getTriggerData('v1-spot')
    expect(result?.totalTrades).toBe(3)
    expect(result?.profitFactor).toBeCloseTo(5.0, 1) // grossProfit(15) / grossLoss(3) = 5.0
    expect(result?.isLive).toBe(true)
  })

  it('returns isLive false when bot status is paper', async () => {
    const botChain = mockChain({ id: 'bot-1', status: 'paper' })
    const tradesChain = mockChain([])
    vi.mocked(supabase.from)
      .mockReturnValueOnce(botChain)
      .mockReturnValueOnce(tradesChain)
    const result = await getTriggerData('v1-spot')
    expect(result?.isLive).toBe(false)
  })
})
