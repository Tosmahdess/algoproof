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

// FIX (final review, C2): `pnl` and `cumul` are GONE from this row, and they
// are not coming back. Both were built from the whole trades array — real money
// and laboratory simulation added together — and rendered two lines under the
// sentence « ces deux totaux ne se fusionnent jamais ». Worse, `rows` is
// reversed (newest first), so the FIRST visible `cumul` cell was exactly
// totalPnlReal + totalPnlLabo: the fused headline the two-column split exists
// to prevent, printed on the page.
//
// The day P&L is now split by cohort, the same way the headline is. There is no
// per-day cumulative at all: the cumulative totals already exist above the
// table, split by cohort, and a second cumulative was both redundant with them
// and the exact place the fusion surfaced.
export interface DayRow {
  date: string
  dateFr: string
  trades: number
  winners: number
  wr: number
  pf: number
  pnlReal: number
  pnlLabo: number
}

// No `totalPnl` either, for the same reason: nothing rendered it, and leaving a
// pre-fused number on the interface is leaving a loaded gun for the next
// renderer that needs "the total".
export interface FleetAggregate {
  rows: DayRow[]
  totalTrades: number
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
  // Built BEFORE the byDay loop (it used to be constructed further down, for the
  // headline only) so each day can be split by cohort as it is accumulated.
  const liveSet = new Set(liveBotIds)

  const byDay: Record<string, {
    trades: number; winners: number; pnlWin: number; pnlLoss: number
    pnlReal: number; pnlLabo: number
  }> = {}

  for (const t of trades) {
    const day = (t.closed_at || '').slice(0, 10)
    if (!day) continue
    if (!byDay[day]) {
      byDay[day] = { trades: 0, winners: 0, pnlWin: 0, pnlLoss: 0, pnlReal: 0, pnlLabo: 0 }
    }
    byDay[day].trades++
    if (liveSet.has(t.bot_id)) byDay[day].pnlReal += t.pnl || 0
    else byDay[day].pnlLabo += t.pnl || 0
    if ((t.pnl || 0) > 0) {
      byDay[day].winners++
      byDay[day].pnlWin += t.pnl
    } else {
      byDay[day].pnlLoss += t.pnl
    }
  }

  const sorted = Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0]))

  const rows: DayRow[] = sorted.map(([date, d]) => {
    const parts = date.split('-')
    return {
      date,
      dateFr: `${parseInt(parts[2])}/${parseInt(parts[1])}/${parts[0]}`,
      trades: d.trades,
      winners: d.winners,
      wr: d.trades > 0 ? Math.round((d.winners / d.trades) * 1000) / 10 : 0,
      pf: pf(d.pnlWin, d.pnlLoss),
      pnlReal: round2(d.pnlReal),
      pnlLabo: round2(d.pnlLabo),
    }
  })

  rows.reverse()

  const totalTrades = trades.length
  const winners = trades.filter(t => (t.pnl || 0) > 0)
  const losers = trades.filter(t => (t.pnl || 0) <= 0)
  const sumPnl = (rs: AggregateTradeRow[]) => round2(rs.reduce((s, t) => s + (t.pnl || 0), 0))

  return {
    rows,
    totalTrades,
    totalPnlReal: sumPnl(trades.filter(t => liveSet.has(t.bot_id))),
    totalPnlLabo: sumPnl(trades.filter(t => !liveSet.has(t.bot_id))),
    totalWr: totalTrades > 0 ? Math.round((winners.length / totalTrades) * 1000) / 10 : 0,
    totalPf: pf(
      winners.reduce((s, t) => s + (t.pnl || 0), 0),
      losers.reduce((s, t) => s + (t.pnl || 0), 0),
    ),
  }
}
