import { describe, it, expect } from 'vitest'
import { computeBadges } from '@/lib/badges'
import type { BotStats } from '@/lib/types'

const BASE: BotStats = {
  win_rate: 0,
  profit_factor: 0,
  max_drawdown: 0,
  total_trades: 0,
  latest_capital: 1000,
}

describe('computeBadges', () => {
  it('returns empty array when no criteria met', () => {
    expect(computeBadges(BASE)).toEqual([])
  })

  it('gives 100-trades badge when total_trades >= 100 (not 50)', () => {
    const b = computeBadges({ ...BASE, total_trades: 100 })
    expect(b.some(x => x.label === '100 trades live')).toBe(true)
    expect(b.some(x => x.label === '50 trades live')).toBe(false)
  })

  it('gives 50-trades badge when total_trades in [50, 99]', () => {
    const b = computeBadges({ ...BASE, total_trades: 75 })
    expect(b.some(x => x.label === '50 trades live')).toBe(true)
    expect(b.some(x => x.label === '100 trades live')).toBe(false)
  })

  it('gives no trades badge when total_trades < 50', () => {
    const b = computeBadges({ ...BASE, total_trades: 49 })
    expect(b.some(x => x.label.includes('trades'))).toBe(false)
  })

  it('gives PF badge when profit_factor >= 1.5', () => {
    const b = computeBadges({ ...BASE, profit_factor: 1.5 })
    expect(b.some(x => x.label === 'PF ≥ 1.5')).toBe(true)
  })

  it('does not give PF badge when profit_factor < 1.5', () => {
    const b = computeBadges({ ...BASE, profit_factor: 1.49 })
    expect(b.some(x => x.label === 'PF ≥ 1.5')).toBe(false)
  })

  it('gives WR badge when win_rate >= 0.60', () => {
    const b = computeBadges({ ...BASE, win_rate: 0.60 })
    expect(b.some(x => x.label === 'WR ≥ 60%')).toBe(true)
  })

  it('gives DD badge when max_drawdown <= 0.05 AND has trades', () => {
    const b = computeBadges({ ...BASE, max_drawdown: 0.04, total_trades: 10 })
    expect(b.some(x => x.label === 'DD ≤ 5%')).toBe(true)
  })

  it('does not give DD badge when no trades (avoids false positive on 0)', () => {
    const b = computeBadges({ ...BASE, max_drawdown: 0, total_trades: 0 })
    expect(b.some(x => x.label === 'DD ≤ 5%')).toBe(false)
  })

  it('gives positif badge when latest_capital > 1000', () => {
    const b = computeBadges({ ...BASE, latest_capital: 1001 })
    expect(b.some(x => x.label === 'En positif')).toBe(true)
  })

  it('returns multiple badges when multiple criteria met', () => {
    const b = computeBadges({
      win_rate: 0.65, profit_factor: 1.6,
      max_drawdown: 0.03, total_trades: 120, latest_capital: 1100,
    })
    expect(b.length).toBeGreaterThanOrEqual(3)
  })
})
