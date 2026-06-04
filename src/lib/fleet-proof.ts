// src/lib/fleet-proof.ts
import type { BotWithStats } from './types'

export interface FleetProof {
  nBots: number
  nWithData: number
  totalTrades: number
  losingTrades: number
  fleetPnl: number
  fleetPF: number
}

export function computeFleetProof(bots: BotWithStats[]): FleetProof {
  let totalTrades = 0, losingTrades = 0, fleetPnl = 0, grossProfit = 0, grossLoss = 0, nWithData = 0
  for (const b of bots) {
    if (b.stats.total_trades > 0) nWithData++
    fleetPnl += b.stats.latest_capital - b.start_capital
    for (const t of b.all_trades) {
      totalTrades++
      if (t.pnl < 0) { losingTrades++; grossLoss += -t.pnl }
      else if (t.pnl > 0) { grossProfit += t.pnl }
    }
  }
  const fleetPF = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0
  return { nBots: bots.length, nWithData, totalTrades, losingTrades, fleetPnl, fleetPF }
}
