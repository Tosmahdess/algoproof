import { describe, it, expect } from 'vitest'
import { groupByStrategy, groupByTimeframe } from '@/lib/fleet-grouping'
import { EMA_CROSS_SLUGS, prodBot, mkBot } from '../fixtures/bots'

describe('groupByStrategy', () => {
  // The bug this file was written to have and did not catch: production
  // `strategy` is a per-deployment sentence, so grouping on it gave 27 groups of
  // one bot — a header per row.
  it('collapses the eight EMA Cross incarnations into ONE group, not eight', () => {
    const groups = groupByStrategy(EMA_CROSS_SLUGS.map(slug => prodBot(slug)))
    expect(groups).toHaveLength(1)
    expect(groups[0].key).toBe('ema-cross')
    expect(groups[0].label).toBe('EMA Cross')
    expect(groups[0].bots).toHaveLength(8)
  })

  it('labels a group with the fiche title, not with any one botsentence', () => {
    const groups = groupByStrategy([prodBot('hmacross-bf22'), prodBot('temacross-bf10')])
    expect(groups.map(g => g.label)).toEqual(['MA Cross'])
    expect(groups[0].ficheSlug).toBe('ma-cross')
  })

  it('separates two fiches that used to share nothing but a wrong key', () => {
    const groups = groupByStrategy([
      prodBot('v1-spot'), prodBot('v1-hl'), prodBot('orb-bf25'),
    ])
    expect(groups.map(g => g.label)).toEqual(['EMA Cross', 'ORB (Opening Range Breakout)'])
  })

  // Nothing may vanish from the register just because the library has no page
  // for it: a grid bot is still a deployed bot.
  it('keeps a bot no fiche claims, under its own strategy sentence', () => {
    const groups = groupByStrategy([prodBot('grid-btc-spot')])
    expect(groups).toHaveLength(1)
    expect(groups[0].ficheSlug).toBeNull()
    expect(groups[0].label).toBe('Grille arithmétique ±8% — BTC/USDT Binance Spot')
    expect(groups[0].bots.map(b => b.slug)).toEqual(['grid-btc-spot'])
  })

  it('does not fuse two different fiche-less bots into one group', () => {
    const groups = groupByStrategy([
      prodBot('grid-btc-spot'), prodBot('funding-rate-harvest'), prodBot('breakout-hl-sol'),
    ])
    expect(groups).toHaveLength(3)
  })

  it('groups an engine-born bot with the legacy bots that run the same strategy', () => {
    const groups = groupByStrategy([
      prodBot('v1-spot'),
      mkBot({ slug: 'emacross-m30-k3', engine_unit_key: 'EMAcross|M30|data_20260701|3' }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].ficheSlug).toBe('ema-cross')
    expect(groups[0].bots).toHaveLength(2)
  })

  it('counts promoted bots separately from the group total', () => {
    const groups = groupByStrategy([
      prodBot('v1-spot', { status: 'live' }),
      prodBot('v1-hl', { status: 'paper' }),
      prodBot('v1-spot-shadow', { status: 'archived' }),
    ])
    expect(groups[0].bots).toHaveLength(3)
    expect(groups[0].promotedCount).toBe(2)
  })

  it('orders groups by size descending, then by label, so the order is stable', () => {
    const groups = groupByStrategy([
      prodBot('orb-bf25'), prodBot('v1-spot'), prodBot('v1-hl'),
    ])
    expect(groups.map(g => g.label)).toEqual(['EMA Cross', 'ORB (Opening Range Breakout)'])
  })

  it('is case- and whitespace-insensitive on a fiche-less key but keeps the first label seen', () => {
    const groups = groupByStrategy([
      mkBot({ slug: 'a', strategy: 'Wavelet Cross' }),
      mkBot({ slug: 'b', strategy: '  wavelet cross ' }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBe('Wavelet Cross')
  })

  it('buckets a bot with an empty strategy rather than dropping it', () => {
    const groups = groupByStrategy([mkBot({ slug: 'nameless', strategy: '' })])
    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBe('Non classées')
    expect(groups[0].bots).toHaveLength(1)
  })
})

// /overview stopped grouping by strategy (groupByStrategy above, retired from
// that page in the per-timeframe rebuild — it stays wired to nothing else in
// this file's own tests) and groups by timeframe instead: a visitor scans one
// H4 table, one D1 table, one H1 table, instead of one dense list of a hundred
// rows in an arbitrary order.
describe('groupByTimeframe', () => {
  const b = (tf: string, name: string, family = 'trend') =>
    mkBot({ slug: name.toLowerCase(), timeframe: tf, name, family: family as never })

  it('groups in canonical TF order, unknown TFs last', () => {
    const groups = groupByTimeframe([
      b('H1', 'Zeta'), b('H4', 'Beta', 'breakout'), b('H4', 'Alpha', 'trend'), b('M15', 'Scalp'),
    ])
    expect(groups.map(g => g.tf)).toEqual(['H4', 'H1', 'M15'])
    // Row order inside a group is the gain ranking, covered by its own describe
    // below; these fixtures share one P&L, so the tie-break (name) decides.
    expect(groups[0].bots.map(x => x.name)).toEqual(['Alpha', 'Beta'])
  })

  it('an empty TF yields no group', () => {
    expect(groupByTimeframe([b('H4', 'A')]).map(g => g.tf)).toEqual(['H4'])
  })

  it('orders D1 between H4 and H1 per the canonical TF_ORDER', () => {
    const groups = groupByTimeframe([b('H1', 'A'), b('D1', 'B'), b('H4', 'C')])
    expect(groups.map(g => g.tf)).toEqual(['H4', 'D1', 'H1'])
  })

  it('sorts two unknown TFs alphabetically after the canonical ones', () => {
    const groups = groupByTimeframe([b('M15', 'A'), b('W1', 'B'), b('H4', 'C')])
    expect(groups.map(g => g.tf)).toEqual(['H4', 'M15', 'W1'])
  })
})

// Row order inside a timeframe table, changed 2026-08-20 on the owner's request:
// biggest gain first. It used to be (family, then name) -- an order that carries
// no information a reader wants, and that buried the best and worst performers
// in the middle of an alphabet.
describe('groupByTimeframe row order — by gain, descending', () => {
  const withPnl = (name: string, latest: number, opts: Partial<{ trades: number; start: number; family: string }> = {}) =>
    mkBot({
      slug: name.toLowerCase(),
      name,
      timeframe: 'H4',
      family: (opts.family ?? 'trend') as never,
      start_capital: opts.start ?? 1000,
      stats: {
        win_rate: 0.5,
        profit_factor: 1.4,
        max_drawdown: 0.08,
        total_trades: opts.trades ?? 60,
        latest_capital: latest,
      },
    })

  it('puts the biggest gain first and the biggest loss last', () => {
    const [group] = groupByTimeframe([
      withPnl('Middling', 1050),
      withPnl('Loser', 820),
      withPnl('Winner', 1400),
    ])

    expect(group.bots.map(b => b.name)).toEqual(['Winner', 'Middling', 'Loser'])
  })

  it('ranks on the GAIN, not on the capital the bot happens to hold', () => {
    // Big starts +100, Small starts +300: sorting on latest_capital alone would
    // put Big first because 5100 > 1300.
    const [group] = groupByTimeframe([
      withPnl('Big', 5100, { start: 5000 }),
      withPnl('Small', 1300, { start: 1000 }),
    ])

    expect(group.bots.map(b => b.name)).toEqual(['Small', 'Big'])
  })

  it('sorts a bot that has never traded LAST, behind even a losing one', () => {
    // A bot with no trades has not gained zero -- it has measured nothing, and
    // ranking it among the results would read as a flat performance it never had.
    // Named so the OLD (family, then name) order would put the untraded one
    // first: this test must be unable to pass by alphabetical accident.
    const [group] = groupByTimeframe([
      withPnl('Aardvark', 1000, { trades: 0 }),
      withPnl('Zulu', 700),
    ])

    expect(group.bots.map(b => b.name)).toEqual(['Zulu', 'Aardvark'])
  })

  it('breaks an exact tie by name, so the order never depends on input order', () => {
    // Families chosen so the OLD rule (family first) would answer Zeta, Alpha.
    const pair = () => [
      withPnl('Zeta', 1200, { family: 'breakout' }),
      withPnl('Alpha', 1200, { family: 'trend' }),
    ]
    const forward = groupByTimeframe(pair())
    const reverse = groupByTimeframe(pair().reverse())

    expect(forward[0].bots.map(b => b.name)).toEqual(['Alpha', 'Zeta'])
    expect(reverse[0].bots.map(b => b.name)).toEqual(['Alpha', 'Zeta'])
  })

  it('orders untraded bots among themselves by name rather than arbitrarily', () => {
    // Same guard: under (family, then name), Yankee/breakout would come first.
    const [group] = groupByTimeframe([
      withPnl('Yankee', 1000, { trades: 0, family: 'breakout' }),
      withPnl('Xray', 1000, { trades: 0, family: 'trend' }),
    ])

    expect(group.bots.map(b => b.name)).toEqual(['Xray', 'Yankee'])
  })
})
