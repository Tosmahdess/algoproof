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
// FIX (final whole-branch review, I7): `winners`, `wr` and `pf` are gone too,
// and they are the same defect C2 fixed one column over. They were accumulated
// across ALL trades regardless of cohort, and FleetBalance rendered « Taux de
// gain » and « F. profit » one column to the LEFT of the split P&L, four lines
// under « Ces deux totaux ne se fusionnent jamais ». On a day where the live
// bot loses and the laboratory wins, that profit factor describes neither.
//
// Not split per cohort instead, deliberately: a day-level win rate over the
// two or three trades one cohort happened to close is noise dressed as a
// statistic, and on the (common) days where a cohort did not trade at all it
// would print 0% / 0.00 as if that were a result. The per-bot fiches are where
// win rate and profit factor mean something, computed over a bot's whole
// history. The day table is Date · Trades · P&L réel · P&L labo — four
// columns, every one of them true.
export interface DayRow {
  date: string
  dateFr: string
  trades: number
  pnlReal: number
  pnlLabo: number
}

// No `totalPnl` either, for the same reason: nothing rendered it, and leaving a
// pre-fused number on the interface is leaving a loaded gun for the next
// renderer that needs "the total".
//
// FIX (final whole-branch review, I7): `totalWr` and `totalPf` are gone on
// exactly that argument. Both were computed across both cohorts, both were
// rendered by nothing, and a fleet-wide profit factor mixing real money with
// simulation is the single most quotable number this page could accidentally
// hand someone. Same gun.
export interface FleetAggregate {
  rows: DayRow[]
  totalTrades: number
  totalPnlReal: number
  totalPnlLabo: number
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
    trades: number; pnlReal: number; pnlLabo: number
  }> = {}

  for (const t of trades) {
    const day = (t.closed_at || '').slice(0, 10)
    if (!day) continue
    if (!byDay[day]) {
      byDay[day] = { trades: 0, pnlReal: 0, pnlLabo: 0 }
    }
    byDay[day].trades++
    if (liveSet.has(t.bot_id)) byDay[day].pnlReal += t.pnl || 0
    else byDay[day].pnlLabo += t.pnl || 0
  }

  const sorted = Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0]))

  const rows: DayRow[] = sorted.map(([date, d]) => {
    const parts = date.split('-')
    return {
      date,
      dateFr: `${parseInt(parts[2])}/${parseInt(parts[1])}/${parts[0]}`,
      trades: d.trades,
      pnlReal: round2(d.pnlReal),
      pnlLabo: round2(d.pnlLabo),
    }
  })

  rows.reverse()

  const sumPnl = (rs: AggregateTradeRow[]) => round2(rs.reduce((s, t) => s + (t.pnl || 0), 0))

  return {
    rows,
    totalTrades: trades.length,
    totalPnlReal: sumPnl(trades.filter(t => liveSet.has(t.bot_id))),
    totalPnlLabo: sumPnl(trades.filter(t => !liveSet.has(t.bot_id))),
  }
}
