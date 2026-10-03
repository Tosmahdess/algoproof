import { describe, it, expect } from 'vitest'
import { sortFleet, SORT_LABELS } from '@/lib/fleet-sort'
import { EMPTY_FILTERS } from '@/lib/bot-filters'
import { mkBot } from '../fixtures/bots'

const st = (total_trades: number, latest_capital: number, over: Partial<{ profit_factor: number; win_rate: number; max_drawdown: number }> = {}) =>
  ({ total_trades, latest_capital, profit_factor: 1, win_rate: 0.5, max_drawdown: 0, ...over })

describe('sortFleet', () => {
  // Owner decision, 2026-10-02 (refonte « registre », lot 4): ONE list, from the
  // best result to the least good. It replaces « Historique » as the default
  // and the proven / rodage / untraded tiers that cut the ranking in two.
  it('defaults to the result, best first, the bots in « rodage » ranked among the others', () => {
    expect(EMPTY_FILTERS.sort).toBe('pnl')
    expect(EMPTY_FILTERS.dir).toBe('desc')
    const bots = [
      mkBot({ name: 'Seasoned', slug: 'seasoned', stats: st(400, 1200) }),
      mkBot({ name: 'Lucky', slug: 'lucky', stats: st(3, 1350) }),
      mkBot({ name: 'Loser', slug: 'loser', stats: st(80, 940) }),
      mkBot({ name: 'Rodage loser', slug: 'rodage-loser', stats: st(5, 990) }),
    ]
    expect(sortFleet(bots, 'pnl', 'desc').map(b => b.slug)).toEqual(['lucky', 'seasoned', 'rodage-loser', 'loser'])
  })

  it('ranks on the euro result the row prints, latest capital minus the bot\'s own start', () => {
    const bots = [
      mkBot({ slug: 'small', start_capital: 400, stats: st(30, 500) }),
      mkBot({ slug: 'big', start_capital: 1000, stats: st(30, 1050) }),
    ]
    expect(sortFleet(bots, 'pnl', 'desc').map(b => b.slug)).toEqual(['small', 'big'])
  })

  it('puts the bots without a trade last, under every sort and both directions, by name', () => {
    const bots = [
      mkBot({ name: 'Zéro B', slug: 'zero-b', stats: st(0, 1000) }),
      mkBot({ name: 'Perdant', slug: 'loser', stats: st(30, 900, { profit_factor: 0.7 }) }),
      mkBot({ name: 'Zéro A', slug: 'zero-a', stats: st(0, 1000) }),
      mkBot({ name: 'Gagnant', slug: 'winner', stats: st(30, 1100, { profit_factor: 1.4 }) }),
    ]
    for (const key of ['pnl', 'pct', 'proven', 'trades', 'profit_factor', 'win_rate', 'max_drawdown'] as const) {
      for (const dir of ['desc', 'asc'] as const) {
        expect(sortFleet(bots, key, dir).slice(2).map(b => b.slug), `${key} ${dir}`).toEqual(['zero-a', 'zero-b'])
      }
    }
    expect(sortFleet(bots, 'pnl', 'desc').map(b => b.slug)).toEqual(['winner', 'loser', 'zero-a', 'zero-b'])
    expect(sortFleet(bots, 'pnl', 'asc').map(b => b.slug)).toEqual(['loser', 'winner', 'zero-a', 'zero-b'])
  })

  it('breaks a tie on the result with the longer history, then the name', () => {
    const bots = [
      mkBot({ name: 'B', slug: 'b', stats: st(30, 1100) }),
      mkBot({ name: 'C', slug: 'c', stats: st(90, 1100) }),
      mkBot({ name: 'A', slug: 'a', stats: st(30, 1100) }),
    ]
    expect(sortFleet(bots, 'pnl', 'desc').map(b => b.slug)).toEqual(['c', 'a', 'b'])
  })

  it('orders names by their numbers, « n° 9 » before « n° 10 »', () => {
    const bots = [
      mkBot({ name: 'Williams n° 10', slug: 'w10', stats: st(0, 1000) }),
      mkBot({ name: 'Williams n° 9', slug: 'w9', stats: st(0, 1000) }),
    ]
    expect(sortFleet(bots, 'pnl', 'desc').map(b => b.slug)).toEqual(['w9', 'w10'])
  })

  it('keeps the history sort on demand: trades descending, the result on a tie', () => {
    const bots = [
      mkBot({ slug: 'lucky', stats: st(3, 3000) }),
      mkBot({ slug: 'seasoned', stats: st(400, 1200) }),
      mkBot({ slug: 'seasoned-better', stats: st(400, 1300) }),
    ]
    expect(sortFleet(bots, 'proven', 'desc').map(b => b.slug)).toEqual(['seasoned-better', 'seasoned', 'lucky'])
  })

  it('never lets an archived bot outrank an active one, whatever the sort', () => {
    const bots = [
      mkBot({ slug: 'retired', status: 'archived', stats: st(999, 5000, { profit_factor: 5, win_rate: 1 }) }),
      mkBot({ slug: 'running', status: 'paper', stats: st(1, 500, { profit_factor: 0.1, win_rate: 0, max_drawdown: 0.5 }) }),
    ]
    for (const key of ['proven', 'trades', 'profit_factor', 'pnl'] as const) {
      expect(sortFleet(bots, key, 'desc')[0].slug).toBe('running')
      expect(sortFleet(bots, key, 'asc')[0].slug).toBe('running')
    }
  })

  it('sorts by percentage gain, not by euros, when asked for « pct »', () => {
    const bots = [
      mkBot({ slug: 'euros', start_capital: 10000, stats: st(30, 10500) }),
      mkBot({ slug: 'percent', start_capital: 1000, stats: st(30, 1300) }),
    ]
    expect(sortFleet(bots, 'pct', 'desc').map(b => b.slug)).toEqual(['percent', 'euros'])
  })

  it('puts a PF the table shows as « — » last, never first (no loss yet, or a carry bot)', () => {
    const bots = [
      mkBot({ slug: 'no-loss', stats: st(30, 1100, { profit_factor: 999, win_rate: 1 }) }),
      mkBot({ slug: 'mid', stats: st(30, 1000, { profit_factor: 1.5 }) }),
      mkBot({ slug: 'carry', family: 'carry', stats: st(30, 1050, { profit_factor: 50, win_rate: 1 }) }),
      mkBot({ slug: 'low', stats: st(30, 900, { profit_factor: 0.8, win_rate: 0.3 }) }),
    ]
    // Among the unmeasured, the result decides: no-loss (+100) before carry (+50).
    expect(sortFleet(bots, 'profit_factor', 'desc').map(b => b.slug)).toEqual(['mid', 'low', 'no-loss', 'carry'])
    expect(sortFleet(bots, 'profit_factor', 'asc').map(b => b.slug).slice(0, 2)).toEqual(['low', 'mid'])
  })

  it('does not mutate its input', () => {
    const bots = [mkBot({ slug: 'a' }), mkBot({ slug: 'b' })]
    const before = bots.map(b => b.slug)
    sortFleet(bots, 'trades', 'asc')
    expect(bots.map(b => b.slug)).toEqual(before)
  })

  it('names the default sort with the words of the page', () => {
    expect(SORT_LABELS.pnl).toBe('Résultat, du meilleur au moins bon')
    expect(SORT_LABELS.proven).toBe('Historique (le plus éprouvé d\'abord)')
  })
})
