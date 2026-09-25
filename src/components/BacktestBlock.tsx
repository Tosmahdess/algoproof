// src/components/BacktestBlock.tsx
//
// The backtest period's own figures and trade list (pilot 2026-09-25). It sits apart from
// the paper block and says what it is: the period was part of the data the recipe was
// selected on, so its figures are flattering by construction and are never merged into
// the paper's.
'use client'

import { useMemo, useState } from 'react'
import MetricsRow from '@/components/MetricsRow'
import TradesTable from '@/components/TradesTable'
import { backtestStats, type BacktestSegment } from '@/lib/backtest-segment'
import { fmtEur, fmtPct, pnlEur, pnlPct } from '@/lib/display'
import { longDate } from '@/lib/format-date'
import type { Trade } from '@/lib/types'

/** Rows shown before « Voir les N trades ». */
const FOLDED = 5

function dayMonth(iso: string): string {
  const s = longDate(iso)
  return s.startsWith('1 ') ? `1er ${s.slice(2)}` : s
}

export default function BacktestBlock({ segment }: { segment: BacktestSegment }) {
  const stats = useMemo(() => backtestStats(segment), [segment])
  const trades: Trade[] = useMemo(() => [...segment.trades].reverse().map((t, i) => ({
    id: `bt-${i}`, bot_id: segment.slug, opened_at: t.opened_at, closed_at: t.closed_at,
    asset: t.asset, side: t.side, pnl: t.pnl, reason: t.reason, is_paper: true,
    entry_price: t.entry_price, exit_price: t.exit_price,
  })), [segment])
  const [open, setOpen] = useState(false)
  const eur = pnlEur(stats.latest_capital, segment.startCapital)
  const pct = pnlPct(stats.latest_capital, segment.startCapital)
  const start = dayMonth(segment.startDate).replace(/ \d{4}$/, '')

  return (
    <div className="bg-card border border-border border-dashed rounded-lg p-6 mb-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <h2 className="text-xl font-semibold">
          Backtest du {start} au {longDate(segment.launchDate)}
        </h2>
        <span className={`font-mono font-semibold text-sm ${eur >= 0 ? 'text-positive' : 'text-negative'}`}>
          {fmtEur(eur)} ({fmtPct(pct)})
        </span>
      </div>
      <p className="text-xs text-muted mb-4">
        Ce que la stratégie aurait fait avant son lancement, avec la même taille de position que
        la simulation. Ces données, elle les avait déjà vues pendant sa sélection : les chiffres
        ci-dessous sont donc flatteurs par construction, et ils ne comptent pas dans ceux de la
        simulation plus haut.
      </p>
      <MetricsRow stats={stats} />
      <div className="mt-6">
        <TradesTable trades={open ? trades : trades.slice(0, FOLDED)} />
        {!open && trades.length > FOLDED && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-4 w-full rounded border border-border px-3 py-2 text-sm text-muted hover:text-foreground transition-colors"
          >
            Voir les {trades.length} trades du backtest
          </button>
        )}
      </div>
    </div>
  )
}
