import { describe, it, expect } from 'vitest'
import { botTier, splitByTier, visibleBots, headlineCohort } from '@/lib/tiers'
import type { BotWithStats } from '@/lib/types'

const bot = (o: { status?: string; promoted?: boolean; trades?: number }): BotWithStats => ({
  status: o.status ?? 'paper',
  promoted: o.promoted ?? false,
  stats: { total_trades: o.trades ?? 1, win_rate: 0, profit_factor: 0, max_drawdown: 0, latest_capital: 1000 },
} as unknown as BotWithStats)

describe('botTier', () => {
  it('live status wins over promoted', () => {
    expect(botTier(bot({ status: 'live', promoted: true }))).toBe('live')
  })
  it('promoted paper → promoted', () => {
    expect(botTier(bot({ status: 'paper', promoted: true }))).toBe('promoted')
  })
  it('plain paper → lab', () => {
    expect(botTier(bot({ status: 'paper', promoted: false }))).toBe('lab')
  })
})

describe('visibleBots', () => {
  it('drops bots with zero trades', () => {
    const r = visibleBots([bot({ trades: 0 }), bot({ trades: 3 })])
    expect(r).toHaveLength(1)
    expect(r[0].stats.total_trades).toBe(3)
  })
})

describe('splitByTier + headlineCohort', () => {
  it('splits and builds headline = live + promoted', () => {
    const bots = [
      bot({ status: 'live' }),
      bot({ status: 'paper', promoted: true }),
      bot({ status: 'paper' }),
    ]
    const s = splitByTier(bots)
    expect(s.live).toHaveLength(1)
    expect(s.promoted).toHaveLength(1)
    expect(s.lab).toHaveLength(1)
    expect(headlineCohort(bots)).toHaveLength(2)
  })
})
