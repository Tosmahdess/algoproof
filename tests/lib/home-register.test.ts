// The home's real-money register (refonte « Le registre des décisions », lot 2).
// The owner's order (02/10/2026): from the best result to the least good, which
// replaces C7's « longest history first ». The state column reads the published
// rule and the last decision; nothing in it is typed by hand.
import { describe, it, expect } from 'vitest'
import { mkBot } from '../fixtures/bots'
import {
  sortByResult, registerState, splitMarket, sinceLabel, readingDate, firstSentence, librarySummary,
} from '@/lib/home-register'

const withResult = (slug: string, latest: number, trades = 40, name = slug) =>
  mkBot({ slug, name, status: 'live', start_capital: 1000,
    stats: { total_trades: trades, win_rate: 0.5, profit_factor: 1.5, max_drawdown: 0.05, latest_capital: latest } })

describe('sortByResult', () => {
  it('puts the best result first and the least good last', () => {
    const bots = [withResult('orb', 982.32), withResult('spot', 1272.73), withResult('hl', 1187.47)]
    expect(sortByResult(bots).map(b => b.slug)).toEqual(['spot', 'hl', 'orb'])
  })

  it('ranks on the euro result, so two bases cannot swap the order through a percentage', () => {
    const a = mkBot({ slug: 'a', start_capital: 400, stats: { ...withResult('x', 0).stats, latest_capital: 480 } }) // +80 €, +20 %
    const b = mkBot({ slug: 'b', start_capital: 1000, stats: { ...withResult('x', 0).stats, latest_capital: 1100 } }) // +100 €, +10 %
    expect(sortByResult([a, b]).map(x => x.slug)).toEqual(['b', 'a'])
  })

  it('sends a bot without a trade to the end, whatever its capital says', () => {
    const bots = [withResult('empty', 1000, 0), withResult('loser', 900), withResult('winner', 1100)]
    expect(sortByResult(bots).map(b => b.slug)).toEqual(['winner', 'loser', 'empty'])
  })

  it('breaks a tie on the name, so the order does not depend on the query', () => {
    const bots = [withResult('b', 1100, 40, 'Zèbre'), withResult('a', 1100, 40, 'Alpha')]
    expect(sortByResult(bots).map(b => b.slug)).toEqual(['a', 'b'])
  })

  it('does not mutate its input', () => {
    const bots = [withResult('a', 900), withResult('b', 1100)]
    sortByResult(bots)
    expect(bots.map(b => b.slug)).toEqual(['a', 'b'])
  })
})

describe('registerState', () => {
  it('ORB: the rule is crossed, and my last decision is « Je le garde »', () => {
    const orb = mkBot({ slug: 'orb-bf25', status: 'live',
      stats: { total_trades: 284, win_rate: 0.45, profit_factor: 0.99, max_drawdown: 0.291, latest_capital: 982.32 } })
    const s = registerState(orb)
    expect(s.kind).toBe('crossed')
    expect(s.label).toBe('Règle d’arrêt franchie')
    expect(s.note).toBe('Je le garde')
  })

  it('v1-hl has no pre-registered limits: it says so rather than pretending it is inside them', () => {
    const s = registerState(withResult('v1-hl', 1187.47, 69))
    expect(s.kind).toBe('none')
    expect(s.label).toBe('Limites non définies')
    expect(s.note).toBe('Je n’ai pas fixé de limites à l’avance.')
  })

  it('v1-spot inside its envelope', () => {
    const spot = mkBot({ slug: 'v1-spot', status: 'live',
      stats: { total_trades: 42, win_rate: 0.6, profit_factor: 2.8, max_drawdown: 0.02, latest_capital: 1272.73 } })
    const s = registerState(spot)
    expect(s.kind).toBe('inside')
    expect(s.label).toBe('Dans les limites attendues')
  })

  it('a bot without a trade is « données insuffisantes », even with limits published', () => {
    const s = registerState(withResult('v1-spot', 1000, 0))
    expect(s.kind).toBe('insufficient')
    expect(s.label).toBe('Données insuffisantes')
    expect(s.note).toMatch(/Aucun trade clos/)
  })

  it('a bot without a trade and without limits is still « données insuffisantes »', () => {
    expect(registerState(withResult('v1-hl', 1000, 0)).kind).toBe('insufficient')
  })

  it('under 20 trades with nothing crossed, I do not conclude yet', () => {
    const s = registerState(withResult('v1-spot', 1010, 12))
    expect(s.kind).toBe('insufficient')
    expect(s.note).toMatch(/Moins de 20 trades/)
  })
})

describe('splitMarket', () => {
  it('takes the venue off the end of the name, where the market line carries it', () => {
    expect(splitMarket('Croisement EMA H4 Kraken Spot', 'Kraken Spot')).toEqual({ title: 'Croisement EMA H4', market: 'Kraken Spot' })
    expect(splitMarket('Cassure de range d\'ouverture H1 Hyperliquid', 'Hyperliquid'))
      .toEqual({ title: 'Cassure de range d\'ouverture H1', market: 'Hyperliquid' })
  })

  it('leaves a name that does not end on its venue untouched', () => {
    expect(splitMarket('Grille BTC', 'Binance Spot')).toEqual({ title: 'Grille BTC', market: 'Binance Spot' })
  })

  it('never empties a name that is only its venue', () => {
    expect(splitMarket('Hyperliquid', 'Hyperliquid')).toEqual({ title: 'Hyperliquid', market: 'Hyperliquid' })
  })
})

describe('sinceLabel', () => {
  const now = new Date('2026-10-02T12:00:00Z')
  it('dates the start from bots.live_since, in Paris, without the year of the reading', () => {
    expect(sinceLabel('2026-04-17T00:00:00+00:00', now)).toBe('depuis le 17 avril')
    expect(sinceLabel('2026-04-16T23:30:00Z', now)).toBe('depuis le 17 avril')
  })
  it('writes the first of the month « 1er »', () => {
    expect(sinceLabel('2026-05-01T08:00:00Z', now)).toBe('depuis le 1er mai')
  })
  it('keeps the year when it is not the year of the reading', () => {
    expect(sinceLabel('2025-11-03T08:00:00Z', now)).toBe('depuis le 3 novembre 2025')
  })
  it('falls back to « depuis le départ » without a date', () => {
    expect(sinceLabel(null, now)).toBe('depuis le départ')
    expect(sinceLabel('not a date', now)).toBe('depuis le départ')
  })
})

describe('readingDate', () => {
  it('is the freshest sync, as a long Paris date', () => {
    expect(readingDate(['2026-10-01T10:00:00Z', null, '2026-10-02T20:00:25Z'])).toBe('2 octobre 2026')
  })
  it('is null when nothing parses', () => {
    expect(readingDate([null, undefined, 'x'])).toBeNull()
  })
})

describe('firstSentence', () => {
  it('keeps the first sentence of a summary', () => {
    expect(firstSentence('L’idée : ne pas acheter. Ça sonne évident. Je l’ai testée.')).toBe('L’idée : ne pas acheter.')
  })
  it('does not cut on a decimal or a percentage', () => {
    expect(firstSentence('Un PF de 1.3 sur 95 % des cas ? Non. La suite.')).toBe('Un PF de 1.3 sur 95 % des cas ?')
  })
  it('returns a summary of one sentence whole', () => {
    expect(firstSentence('Une seule phrase sans point')).toBe('Une seule phrase sans point')
  })
})

describe('librarySummary', () => {
  it('counts ideas and sums variants by state, like /bibliotheque', () => {
    const idea = (n_variants: number, n_live: number, n_paper: number, n_backtest: number) =>
      ({ n_variants, n_live, n_paper, n_backtest })
    expect(librarySummary([idea(10, 1, 3, 6), idea(5, 0, 1, 4)]))
      .toEqual({ ideas: 2, variants: 15, live: 1, paper: 4, waiting: 10 })
  })
  it('is all zeros on an empty library', () => {
    expect(librarySummary([])).toEqual({ ideas: 0, variants: 0, live: 0, paper: 0, waiting: 0 })
  })
})
