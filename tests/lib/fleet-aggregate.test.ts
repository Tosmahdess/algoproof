import { describe, it, expect } from 'vitest'
import { computeFleetAggregate, type AggregateTradeRow } from '@/lib/fleet-aggregate'

const t = (bot_id: string, pnl: number, closed_at: string, side = 'long'): AggregateTradeRow =>
  ({ bot_id, pnl, closed_at, side, asset: 'BTC/USDC' })

describe('computeFleetAggregate', () => {
  const trades = [
    t('real', 10, '2026-07-01T10:00:00Z'),
    t('real', -4, '2026-07-01T18:00:00Z'),
    t('labo', 6, '2026-07-02T09:00:00Z'),
    t('labo', -20, '2026-07-03T09:00:00Z'),
  ]

  it('never fuses real money and laboratory into one number', () => {
    const a = computeFleetAggregate(trades, ['real'])
    expect(a.totalPnlReal).toBe(6)
    expect(a.totalPnlLabo).toBe(-14)
    expect(a.totalPnl).toBe(-8)
  })

  it('builds one row per day, newest first, with a running cumulative', () => {
    const a = computeFleetAggregate(trades, ['real'])
    expect(a.rows.map(r => r.date)).toEqual(['2026-07-03', '2026-07-02', '2026-07-01'])
    // cumul is computed oldest-to-newest, then the list is reversed
    expect(a.rows[a.rows.length - 1].cumul).toBe(6)
    expect(a.rows[0].cumul).toBe(-8)
  })

  it('formats the French date without leading zeros', () => {
    const a = computeFleetAggregate([t('x', 1, '2026-07-05T00:00:00Z')], [])
    expect(a.rows[0].dateFr).toBe('5/7/2026')
  })

  it('caps profit factor at 99.9 when there are no losses', () => {
    const a = computeFleetAggregate([t('x', 5, '2026-07-01T00:00:00Z')], [])
    expect(a.totalPf).toBe(99.9)
  })

  it('reports a profit factor of 0 when there are no winners', () => {
    const a = computeFleetAggregate([t('x', -5, '2026-07-01T00:00:00Z')], [])
    expect(a.totalPf).toBe(0)
  })

  it('treats a zero-pnl trade as a loser, matching the previous behaviour', () => {
    const a = computeFleetAggregate([t('x', 0, '2026-07-01T00:00:00Z')], [])
    expect(a.totalWr).toBe(0)
    expect(a.rows[0].winners).toBe(0)
  })

  it('skips trades with no closing date rather than bucketing them under empty string', () => {
    const a = computeFleetAggregate([t('x', 5, ''), t('x', 5, '2026-07-01T00:00:00Z')], [])
    expect(a.rows).toHaveLength(1)
    // the skipped trade still counts in the totals, as it did before
    expect(a.totalTrades).toBe(2)
  })

  it('returns an empty but well-formed result for no trades', () => {
    const a = computeFleetAggregate([], [])
    expect(a).toEqual({
      rows: [], totalTrades: 0, totalPnl: 0, totalPnlReal: 0,
      totalPnlLabo: 0, totalWr: 0, totalPf: 0,
    })
  })
})
