// src/lib/fleet-aggregate.ts
// The fleet's headline aggregate, extracted verbatim from PerformanceClient's
// useMemo so stage 0 of « La flotte » and any other surface report identical
// numbers.
//
// Deliberately NOT parameterised by a filter. Stage 0 is unfilterable by design
// (spec §6.1): a filterable aggregate is the tool for telling a flattering
// story, and the unfiltered total is what makes the page defensible. Filtering
// happens on the register below it, through bot-filters.ts.

export interface AggregateTradeRow {
  pnl: number
  side: string
  closed_at: string
  bot_id: string
  asset: string
}

export interface DayRow {
  date: string
  dateFr: string
  trades: number
  winners: number
  wr: number
  pf: number
  pnl: number
  cumul: number
}

export interface FleetAggregate {
  rows: DayRow[]
  totalTrades: number
  totalPnl: number
  totalPnlReal: number
  totalPnlLabo: number
  totalWr: number
  totalPf: number
}

/** Profit factor, capped. Mirrors the previous local fmtPf exactly. */
function pf(wins: number, losses: number): number {
  const absLoss = Math.abs(losses)
  if (absLoss === 0) return wins > 0 ? 99.9 : 0
  return Math.min(Math.round((wins / absLoss) * 100) / 100, 99.9)
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function computeFleetAggregate(
  trades: AggregateTradeRow[],
  liveBotIds: string[],
): FleetAggregate {
  const byDay: Record<string, { trades: number; winners: number; pnlWin: number; pnlLoss: number; pnl: number }> = {}

  for (const t of trades) {
    const day = (t.closed_at || '').slice(0, 10)
    if (!day) continue
    if (!byDay[day]) byDay[day] = { trades: 0, winners: 0, pnlWin: 0, pnlLoss: 0, pnl: 0 }
    byDay[day].trades++
    byDay[day].pnl += t.pnl || 0
    if ((t.pnl || 0) > 0) {
      byDay[day].winners++
      byDay[day].pnlWin += t.pnl
    } else {
      byDay[day].pnlLoss += t.pnl
    }
  }

  const sorted = Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0]))

  let cumul = 0
  const rows: DayRow[] = sorted.map(([date, d]) => {
    cumul += d.pnl
    const parts = date.split('-')
    return {
      date,
      dateFr: `${parseInt(parts[2])}/${parseInt(parts[1])}/${parts[0]}`,
      trades: d.trades,
      winners: d.winners,
      wr: d.trades > 0 ? Math.round((d.winners / d.trades) * 1000) / 10 : 0,
      pf: pf(d.pnlWin, d.pnlLoss),
      pnl: round2(d.pnl),
      cumul: round2(cumul),
    }
  })

  rows.reverse()

  const totalTrades = trades.length
  const winners = trades.filter(t => (t.pnl || 0) > 0)
  const losers = trades.filter(t => (t.pnl || 0) <= 0)
  const sumPnl = (rs: AggregateTradeRow[]) => round2(rs.reduce((s, t) => s + (t.pnl || 0), 0))

  const liveSet = new Set(liveBotIds)

  return {
    rows,
    totalTrades,
    totalPnl: sumPnl(trades),
    totalPnlReal: sumPnl(trades.filter(t => liveSet.has(t.bot_id))),
    totalPnlLabo: sumPnl(trades.filter(t => !liveSet.has(t.bot_id))),
    totalWr: totalTrades > 0 ? Math.round((winners.length / totalTrades) * 1000) / 10 : 0,
    totalPf: pf(
      winners.reduce((s, t) => s + (t.pnl || 0), 0),
      losers.reduce((s, t) => s + (t.pnl || 0), 0),
    ),
  }
}
