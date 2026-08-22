import { describe, it, expect } from 'vitest'
import { computeFleetAggregate, type AggregateTradeRow } from '@/lib/fleet-aggregate'

const t = (bot_id: string, pnl: number, closed_at: string, side = 'long'): AggregateTradeRow =>
  ({ bot_id, pnl, closed_at, side, asset: 'BTC/USDC' })

describe('computeFleetAggregate', () => {
  // Regression, 2026-08-22. Every bot here starts in paper and is promoted later.
  // The split used to read the bot's status TODAY and apply it to its whole
  // history, so a promotion rewrote the past: on production that day, /overview
  // announced 300 trades and +157,98 € of real money where only 292 trades and
  // +112,46 € had ever been traded with real money. The 8 extra were v1-spot's
  // own paper period. A bot's real-money history starts at live_since, never before.
  describe('a promoted bot does not turn its paper past into real money', () => {
    const promoted = [
      t('bot', 45, '2026-04-20T10:00:00Z'), // paper: before live_since
      t('bot', 10, '2026-05-08T10:00:00Z'), // first real-money day
      t('bot', -4, '2026-05-09T10:00:00Z'),
    ]
    const live = [{ id: 'bot', live_since: '2026-05-08T00:00:00Z' }]

    it('counts only the trades closed on or after live_since as real money', () => {
      const a = computeFleetAggregate(promoted, live)
      expect(a.totalPnlReal).toBe(6)
      expect(a.totalPnlLabo).toBe(45)
    })

    it('splits the day rows the same way', () => {
      const a = computeFleetAggregate(promoted, live)
      const april = a.rows.find(r => r.date === '2026-04-20')
      expect(april?.pnlReal).toBe(0)
      expect(april?.pnlLabo).toBe(45)
    })

    it('treats a live bot with no live_since as having no real-money history', () => {
      const a = computeFleetAggregate(promoted, [{ id: 'bot', live_since: null }])
      expect(a.totalPnlReal).toBe(0)
      expect(a.totalPnlLabo).toBe(51)
    })
  })

  const trades = [
    t('real', 10, '2026-07-01T10:00:00Z'),
    t('real', -4, '2026-07-01T18:00:00Z'),
    t('labo', 6, '2026-07-02T09:00:00Z'),
    t('labo', -20, '2026-07-03T09:00:00Z'),
  ]

  it('never fuses real money and laboratory into one number', () => {
    const a = computeFleetAggregate(trades, [{ id: 'real', live_since: '2026-01-01T00:00:00Z' }])
    expect(a.totalPnlReal).toBe(6)
    expect(a.totalPnlLabo).toBe(-14)
    // FIX (final review, C2): there is no fused `totalPnl` on the interface at
    // all any more. Nothing rendered it, and leaving it there left a pre-fused
    // number available for the next renderer that wants "the total".
    expect('totalPnl' in a).toBe(false)
  })

  // FIX (final whole-branch review, I7): `totalWr` and `totalPf` survived the
  // C2 pass. Both were computed across both cohorts, both were rendered by
  // nothing, and a fleet-wide profit factor mixing real money with simulation
  // is the most quotable number this page could accidentally hand someone.
  // Same argument the comment above `FleetAggregate` makes about `totalPnl`.
  it('exposes no cross-cohort rate or ratio at all', () => {
    const a = computeFleetAggregate(trades, [{ id: 'real', live_since: '2026-01-01T00:00:00Z' }])
    expect('totalWr' in a).toBe(false)
    expect('totalPf' in a).toBe(false)
    expect(Object.keys(a).sort()).toEqual(
      ['rows', 'totalPnlLabo', 'totalPnlReal', 'totalTrades'],
    )
  })

  it('builds one row per day, newest first', () => {
    const a = computeFleetAggregate(trades, [{ id: 'real', live_since: '2026-01-01T00:00:00Z' }])
    expect(a.rows.map(r => r.date)).toEqual(['2026-07-03', '2026-07-02', '2026-07-01'])
  })

  // FIX (final review, C2): the per-day P&L used to be built from the WHOLE
  // trades array — liveBots was only ever consulted for the headline — so
  // every cell in the day table was real euros plus simulated euros in one
  // figure, and the first (newest) Cumul cell was exactly
  // totalPnlReal + totalPnlLabo.
  it('splits each day P&L by cohort, exactly like the headline', () => {
    const a = computeFleetAggregate(trades, [{ id: 'real', live_since: '2026-01-01T00:00:00Z' }])
    const byDate = Object.fromEntries(a.rows.map(r => [r.date, r]))
    expect(byDate['2026-07-01'].pnlReal).toBe(6)
    expect(byDate['2026-07-01'].pnlLabo).toBe(0)
    expect(byDate['2026-07-02'].pnlReal).toBe(0)
    expect(byDate['2026-07-02'].pnlLabo).toBe(6)
    expect(byDate['2026-07-03'].pnlLabo).toBe(-20)
  })

  it('carries no fused or cumulative P&L field on a day row', () => {
    const a = computeFleetAggregate(trades, [{ id: 'real', live_since: '2026-01-01T00:00:00Z' }])
    for (const row of a.rows) {
      expect('pnl' in row).toBe(false)
      expect('cumul' in row).toBe(false)
    }
  })

  // FIX (final whole-branch review, I7): a day row carries no cross-cohort
  // statistic either — `winners`, `wr` and `pf` were all accumulated over the
  // whole day regardless of which cohort produced the trade.
  it('carries no cross-cohort win rate, profit factor or winner count on a day row', () => {
    const a = computeFleetAggregate(trades, [{ id: 'real', live_since: '2026-01-01T00:00:00Z' }])
    for (const row of a.rows) {
      expect(Object.keys(row).sort()).toEqual(
        ['date', 'dateFr', 'pnlLabo', 'pnlReal', 'trades'],
      )
    }
  })

  it('day cohort P&L sums back to the headline cohort totals', () => {
    const a = computeFleetAggregate(trades, [{ id: 'real', live_since: '2026-01-01T00:00:00Z' }])
    const sum = (k: 'pnlReal' | 'pnlLabo') =>
      Math.round(a.rows.reduce((s, r) => s + r[k], 0) * 100) / 100
    expect(sum('pnlReal')).toBe(a.totalPnlReal)
    expect(sum('pnlLabo')).toBe(a.totalPnlLabo)
  })

  it('attributes a day to the laboratory when no bot is live', () => {
    const a = computeFleetAggregate(trades, [])
    expect(a.rows.every(r => r.pnlReal === 0)).toBe(true)
    expect(a.totalPnlReal).toBe(0)
  })

  it('formats the French date without leading zeros', () => {
    const a = computeFleetAggregate([t('x', 1, '2026-07-05T00:00:00Z')], [])
    expect(a.rows[0].dateFr).toBe('5/7/2026')
  })

  // The profit-factor cap and the "a zero-pnl trade counts as a loser"
  // convention were the only behaviours totalPf/totalWr/winners carried, and
  // they left with those fields (I7). Nothing else consumed them: profit
  // factor and win rate are computed per bot in getBotWithStats, over that
  // bot's own history, which is the only scope where they mean anything.

  it('skips trades with no closing date rather than bucketing them under empty string', () => {
    const a = computeFleetAggregate([t('x', 5, ''), t('x', 5, '2026-07-01T00:00:00Z')], [])
    expect(a.rows).toHaveLength(1)
    // the skipped trade still counts in the totals, as it did before
    expect(a.totalTrades).toBe(2)
  })

  it('returns an empty but well-formed result for no trades', () => {
    const a = computeFleetAggregate([], [])
    expect(a).toEqual({
      rows: [], totalTrades: 0, totalPnlReal: 0, totalPnlLabo: 0,
    })
  })
})
