// src/components/BacktestBlock.tsx
//
// The backtest period's own figures and trade list (pilot 2026-09-25). It sits apart from
// the simulation and says what it is: the period, 1 January to the freeze, is the data the
// recipe was selected on, so its figures are flattering by construction and are never
// merged into the simulation's.
'use client'

import { useMemo, useState } from 'react'
import MetricsRow from '@/components/MetricsRow'
import TradesTable from '@/components/TradesTable'
import { backtestStats, backtestTrades, reconcileCents, type BacktestSegment } from '@/lib/backtest-segment'
import { fmtEur, fmtPct, pnlEur, pnlPct } from '@/lib/display'
import { cumulativeAfterEach, sumOfResults } from '@/lib/trade-ledger'
import { longDateOrdinal } from '@/lib/format-date'
import SegmentVerdictBadge from '@/components/SegmentVerdictBadge'
import type { Trade } from '@/lib/types'

/** Rows shown before « Voir les N trades ». */
const FOLDED = 5

export default function BacktestBlock({ segment }: { segment: BacktestSegment }) {
  const stats = useMemo(() => backtestStats(segment), [segment])
  // The listed trades add up to the block's result, to the cent (Astra audit, point 7).
  const trades: Trade[] = useMemo(() => reconcileCents([...backtestTrades(segment)],
    stats.latest_capital - segment.startCapital).reverse().map((t, i) => ({
    id: `bt-${i}`, bot_id: segment.slug, opened_at: t.opened_at, closed_at: t.closed_at,
    asset: t.asset, side: t.side, pnl: t.pnl, reason: t.reason, is_paper: true,
    entry_price: t.entry_price, exit_price: t.exit_price,
  })), [segment, stats])
  // Every backtest trade is in `trades`, so the cumul runs on the whole backtest.
  const cumul = useMemo(() => cumulativeAfterEach(trades, segment.startCapital), [trades, segment])
  const [open, setOpen] = useState(false)
  const eur = pnlEur(stats.latest_capital, segment.startCapital)
  const pct = pnlPct(stats.latest_capital, segment.startCapital)
  const start = longDateOrdinal(segment.startDate).replace(/ \d{4}$/, '')

  return (
    // Refonte lot 3 (2026-10-02, audit 2026-10 constat 4): the backtest is apart and grey.
    // Its result is in muted ink, never in the simulation's colours; a dashed rule, not a
    // card, sets it off from the simulation's register above.
    <div data-testid="backtest-block" className="border-t border-dashed border-border-strong pt-6 mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <h3 className="text-lg font-semibold">
          {`Backtest du ${start} au ${longDateOrdinal(segment.freezeDate)}`}
          <SegmentVerdictBadge verdict={segment.verdict} />
        </h3>
        <span className="tabular-nums text-sm text-muted">
          {`${fmtEur(eur)} (${fmtPct(pct)}), à part`}
        </span>
      </div>
      {segment.verdict ? (
        <p className="text-xs text-muted mb-4">
          Ce que la stratégie aurait fait sur les données où je l&apos;ai testée, avec des
          positions de même taille que la simulation. Ces jours-là, je les avais déjà regardés :
          les chiffres ci-dessous sont flatteurs par construction et ne comptent pas dans ceux de
          la simulation plus haut.
          {segment.verdict === 'rejected' && " Elle a échoué à mes propres tests (sur-ajustement probable, échec hors échantillon). Je la fais tourner en simulation pour vérifier ce rejet, pas parce que j'y crois."}
        </p>
      ) : (
        <p className="text-xs text-muted mb-4">
          Ce que la stratégie aurait fait sur les données de sa sélection, avec la même taille de
          position que la simulation. Elle les connaissait déjà, donc ces chiffres sont flatteurs
          par construction. Ils ne comptent pas dans ceux de la simulation plus haut.
        </p>
      )}
      <MetricsRow stats={stats} drawdownTone="neutral" />
      <div className="mt-6">
        <TradesTable trades={open ? trades : trades.slice(0, FOLDED)} cumul={cumul}
          total={open ? { label: `Total des ${trades.length} trades du backtest`, sum: sumOfResults(trades),
            cumul: segment.startCapital + sumOfResults(trades) } : undefined} />
        {!open && trades.length > FOLDED && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-4 w-full min-h-11 rounded border border-border-strong px-3 py-2 text-sm text-foreground hover:bg-card-2 transition-colors"
          >
            {`Voir les ${trades.length} trades du backtest`}
          </button>
        )}
      </div>
    </div>
  )
}
