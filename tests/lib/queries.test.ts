// tests/lib/queries.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase'
import { getBots, getBotSlugs, getTriggerData, getBotWithStats, getAllBotsWithStats } from '@/lib/queries'

const mockChain = (data: unknown, error: unknown = null) => {
  const terminal = { data, error }
  // The chain is itself a thenable so that awaiting it (without .order()/.single()) resolves correctly.
  // Methods that keep the chain return `this`; terminal methods resolve with the data.
  const chain: any = {
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(terminal).then(resolve),
    select: vi.fn().mockReturnThis(),
    neq:    vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    // order is chainable (the chain is itself thenable, so awaiting after .order()
    // still resolves) so that paginated fetches can call .range() after .order().
    order:  vi.fn().mockReturnThis(),
    range:  vi.fn().mockResolvedValue(terminal),
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

  it('counts trades regardless of is_paper — same definition as getBotWithStats/BotCard', async () => {
    // Regression: v1-spot runs a paper-mirror ledger (is_paper=true on every row) as
    // its official public track record. getTriggerData must not filter on is_paper,
    // otherwise it reports 0/30 while the bot fiche shows 13 trades / PF 2.00 for the
    // exact same bot_id.
    const botChain = mockChain({ id: 'bot-1', status: 'live' })
    const tradesChain = mockChain([
      { pnl: 10, is_paper: true }, { pnl: 5, is_paper: true }, { pnl: -3, is_paper: true },
    ])
    vi.mocked(supabase.from)
      .mockReturnValueOnce(botChain)
      .mockReturnValueOnce(tradesChain)
    const result = await getTriggerData('v1-spot')
    expect(result?.totalTrades).toBe(3)
    expect(result?.profitFactor).toBeCloseTo(5.0, 1)
  })

  it('never filters the trades query by is_paper', async () => {
    const botChain = mockChain({ id: 'bot-1', status: 'live' })
    const tradesChain = mockChain([{ pnl: 10 }])
    vi.mocked(supabase.from)
      .mockReturnValueOnce(botChain)
      .mockReturnValueOnce(tradesChain)
    await getTriggerData('v1-spot')
    const eqCalls = tradesChain.eq.mock.calls.map((c: unknown[]) => c[0])
    expect(eqCalls).not.toContain('is_paper')
  })
})

const MOCK_BOT = { id: 'bot-1', slug: 'v1-spot', name: 'EMA Cross', strategy: 'EMA', status: 'live', family: 'trend', exchange: 'Binance', assets: ['BTC/USDT'], timeframe: 'H4', description: null, created_at: '2026-01-01' }
const MOCK_TRADE_WIN  = { id: 't1', bot_id: 'bot-1', pnl: 10, opened_at: '', closed_at: '', asset: 'BTC/USDT', side: 'long', reason: null, is_paper: false }
const MOCK_TRADE_LOSS = { id: 't2', bot_id: 'bot-1', pnl: -4, opened_at: '', closed_at: '', asset: 'BTC/USDT', side: 'long', reason: null, is_paper: false }
const MOCK_PERF = (capital: number, date: string) => ({ id: 'p1', bot_id: 'bot-1', date, capital, pnl_day: 0, win_rate: null, profit_factor: null })

describe('getBotWithStats', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns null when bot not found', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(mockChain(null, { message: 'not found' }))
    const result = await getBotWithStats('unknown')
    expect(result).toBeNull()
  })

  it('throws when trades fetch fails', async () => {
    vi.mocked(supabase.from)
      .mockReturnValueOnce(mockChain(MOCK_BOT))
      .mockReturnValueOnce(mockChain(null, { message: 'trades error' }))
    await expect(getBotWithStats('v1-spot')).rejects.toThrow('trades fetch failed')
  })

  it('throws when perf_daily fetch fails', async () => {
    vi.mocked(supabase.from)
      .mockReturnValueOnce(mockChain(MOCK_BOT))
      .mockReturnValueOnce(mockChain([MOCK_TRADE_WIN]))
      .mockReturnValueOnce(mockChain(null, { message: 'perf error' }))
    await expect(getBotWithStats('v1-spot')).rejects.toThrow('perf_daily fetch failed')
  })

  it('returns zero stats when no trades and no perf', async () => {
    vi.mocked(supabase.from)
      .mockReturnValueOnce(mockChain(MOCK_BOT))
      .mockReturnValueOnce(mockChain([]))
      .mockReturnValueOnce(mockChain([]))
    const result = await getBotWithStats('v1-spot')
    expect(result).not.toBeNull()
    expect(result!.stats.total_trades).toBe(0)
    expect(result!.stats.win_rate).toBe(0)
    expect(result!.stats.profit_factor).toBe(0)
    expect(result!.stats.latest_capital).toBe(1000)
  })

  it('calculates win_rate correctly', async () => {
    vi.mocked(supabase.from)
      .mockReturnValueOnce(mockChain(MOCK_BOT))
      .mockReturnValueOnce(mockChain([MOCK_TRADE_WIN, MOCK_TRADE_WIN, MOCK_TRADE_LOSS]))
      .mockReturnValueOnce(mockChain([]))
    const result = await getBotWithStats('v1-spot')
    expect(result!.stats.win_rate).toBeCloseTo(2 / 3, 5)
  })

  it('calculates profit_factor as grossProfit/grossLoss', async () => {
    vi.mocked(supabase.from)
      .mockReturnValueOnce(mockChain(MOCK_BOT))
      .mockReturnValueOnce(mockChain([MOCK_TRADE_WIN, MOCK_TRADE_LOSS])) // 10 / 4 = 2.5
      .mockReturnValueOnce(mockChain([]))
    const result = await getBotWithStats('v1-spot')
    expect(result!.stats.profit_factor).toBeCloseTo(2.5, 5)
  })

  it('returns profit_factor 999 when all trades are wins', async () => {
    vi.mocked(supabase.from)
      .mockReturnValueOnce(mockChain(MOCK_BOT))
      .mockReturnValueOnce(mockChain([MOCK_TRADE_WIN, MOCK_TRADE_WIN]))
      .mockReturnValueOnce(mockChain([]))
    const result = await getBotWithStats('v1-spot')
    expect(result!.stats.profit_factor).toBe(999)
  })

  it('calculates max_drawdown from perf_daily capitals', async () => {
    // capitals: [1000, 1100, 900, 950] → peak 1100 → worst dd = (1100-900)/1100
    const perf = [
      MOCK_PERF(1000, '2026-01-01'),
      MOCK_PERF(1100, '2026-01-02'),
      MOCK_PERF(900,  '2026-01-03'),
      MOCK_PERF(950,  '2026-01-04'),
    ]
    vi.mocked(supabase.from)
      .mockReturnValueOnce(mockChain(MOCK_BOT))
      .mockReturnValueOnce(mockChain([]))
      .mockReturnValueOnce(mockChain(perf))
    const result = await getBotWithStats('v1-spot')
    expect(result!.stats.max_drawdown).toBeCloseTo((1100 - 900) / 1100, 5)
    expect(result!.stats.latest_capital).toBe(950)
  })

  it('slices recent_trades to 20', async () => {
    const manyTrades = Array.from({ length: 25 }, (_, i) => ({ ...MOCK_TRADE_WIN, id: `t${i}` }))
    vi.mocked(supabase.from)
      .mockReturnValueOnce(mockChain(MOCK_BOT))
      .mockReturnValueOnce(mockChain(manyTrades))
      .mockReturnValueOnce(mockChain([]))
    const result = await getBotWithStats('v1-spot')
    expect(result!.recent_trades).toHaveLength(20)
    expect(result!.stats.total_trades).toBe(25)
  })

  it('returns spread bot fields on the result', async () => {
    vi.mocked(supabase.from)
      .mockReturnValueOnce(mockChain(MOCK_BOT))
      .mockReturnValueOnce(mockChain([]))
      .mockReturnValueOnce(mockChain([]))
    const result = await getBotWithStats('v1-spot')
    expect(result!.slug).toBe('v1-spot')
    expect(result!.name).toBe('EMA Cross')
    expect(result!.status).toBe('live')
  })
})

describe('getAllBotsWithStats', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns empty array when no bots', async () => {
    vi.mocked(supabase.from).mockReturnValue(mockChain([]))
    const result = await getAllBotsWithStats()
    expect(result).toEqual([])
  })

  it('throws when getBotWithStats returns null for a listed bot', async () => {
    // getBots() call: returns 1 bot
    vi.mocked(supabase.from)
      .mockReturnValueOnce(mockChain([MOCK_BOT]))
      // getBotWithStats for that bot: bot not found (null)
      .mockReturnValueOnce(mockChain(null, { message: 'not found' }))
    await expect(getAllBotsWithStats()).rejects.toThrow('getBotWithStats returned null')
  })
})
