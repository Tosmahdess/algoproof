import { describe, it, expect } from 'vitest'
import { sortFleet, SORT_LABELS } from '@/lib/fleet-sort'
import { EMPTY_FILTERS } from '@/lib/bot-filters'
import { mkBot } from '../fixtures/bots'

describe('sortFleet', () => {
  it('defaults to the most-proven-first sort, not a performance ranking', () => {
    expect(EMPTY_FILTERS.sort).toBe('proven')
    const bots = [
      mkBot({ slug: 'lucky', stats: { total_trades: 3, profit_factor: 9, win_rate: 1, max_drawdown: 0, latest_capital: 3000 } }),
      mkBot({ slug: 'seasoned', stats: { total_trades: 400, profit_factor: 1.2, win_rate: 0.45, max_drawdown: 0.1, latest_capital: 1200 } }),
    ]
    expect(sortFleet(bots, 'proven', 'desc').map(b => b.slug)).toEqual(['seasoned', 'lucky'])
  })

  it('never lets an archived bot outrank an active one, whatever the sort', () => {
    const bots = [
      mkBot({ slug: 'retired', status: 'archived', stats: { total_trades: 999, profit_factor: 5, win_rate: 1, max_drawdown: 0, latest_capital: 5000 } }),
      mkBot({ slug: 'running', status: 'paper', stats: { total_trades: 1, profit_factor: 0.1, win_rate: 0, max_drawdown: 0.5, latest_capital: 500 } }),
    ]
    for (const key of ['proven', 'trades', 'profit_factor', 'pnl'] as const) {
      expect(sortFleet(bots, key, 'desc')[0].slug).toBe('running')
      expect(sortFleet(bots, key, 'asc')[0].slug).toBe('running')
    }
  })

  it('sorts by P&L relative to each bot\'s own starting capital', () => {
    const bots = [
      mkBot({ slug: 'small', start_capital: 400, stats: { latest_capital: 500, total_trades: 30, profit_factor: 1, win_rate: 0.5, max_drawdown: 0 } }),
      mkBot({ slug: 'big', start_capital: 1000, stats: { latest_capital: 1050, total_trades: 30, profit_factor: 1, win_rate: 0.5, max_drawdown: 0 } }),
    ]
    expect(sortFleet(bots, 'pnl', 'desc').map(b => b.slug)).toEqual(['small', 'big'])
  })

  it('does not mutate its input', () => {
    const bots = [mkBot({ slug: 'a' }), mkBot({ slug: 'b' })]
    const before = bots.map(b => b.slug)
    sortFleet(bots, 'trades', 'asc')
    expect(bots.map(b => b.slug)).toEqual(before)
  })

  it('labels the default sort in a way that can be defended out loud', () => {
    expect(SORT_LABELS.proven).toBe('Historique (le plus éprouvé d\'abord)')
  })
})
