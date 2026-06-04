import { describe, it, expect } from 'vitest'
import { computeFleetProof } from '@/lib/fleet-proof'
import type { BotWithStats } from '@/lib/types'

const bot = (o: { trades: number[]; start?: number; latest: number }): BotWithStats => ({
  stats: { total_trades: o.trades.length, win_rate: 0, profit_factor: 0, max_drawdown: 0, latest_capital: o.latest },
  start_capital: o.start ?? 1000,
  all_trades: o.trades.map((pnl, i) => ({
    id: String(i), bot_id: 'b', opened_at: '', closed_at: '2026-06-01',
    asset: 'BTC', side: 'long', pnl, reason: '', is_paper: true,
  })),
} as unknown as BotWithStats)

describe('computeFleetProof', () => {
  it('aggregates trades, losses, pnl and profit factor across the fleet', () => {
    const r = computeFleetProof([
      bot({ trades: [10, 20], latest: 1030 }),       // +30
      bot({ trades: [-5, -15], latest: 980 }),       // -20
    ])
    expect(r.nBots).toBe(2)
    expect(r.nWithData).toBe(2)
    expect(r.totalTrades).toBe(4)
    expect(r.losingTrades).toBe(2)
    expect(r.fleetPnl).toBeCloseTo(10, 2)
    expect(r.fleetPF).toBeCloseTo(1.5, 2) // 30 / 20
  })
  it('returns zeros for an empty fleet (no NaN)', () => {
    const r = computeFleetProof([])
    expect(r).toEqual({ nBots: 0, nWithData: 0, totalTrades: 0, losingTrades: 0, fleetPnl: 0, fleetPF: 0 })
  })
  it('uses PF 999 sentinel when there are wins but no losses', () => {
    const r = computeFleetProof([bot({ trades: [10], latest: 1010 })])
    expect(r.fleetPF).toBe(999)
    expect(r.losingTrades).toBe(0)
  })
})
