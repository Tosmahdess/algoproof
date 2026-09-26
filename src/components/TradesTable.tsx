import { Trade } from '@/lib/types'
import { reasonFr } from '@/lib/regime-labels'
import { shortDatePadded } from '@/lib/format-date'
import { fmtEur } from '@/lib/display'

// Exit reasons and trade direction are neutral: green and red belong to the
// P&L alone (D066). A stop can close a winning trade, a red « SL » beside a
// gain read as a loss (counter-audit 2026-09-26, S5).
const NEUTRAL_TAG = 'bg-card-2 text-muted'

const REASON_MAP: Record<string, { label: string; cls: string }> = {
  take_profit_1:     { label: 'TP1',   cls: NEUTRAL_TAG },
  take_profit_2:     { label: 'TP2',   cls: NEUTRAL_TAG },
  trailing_stop:     { label: 'Trail', cls: NEUTRAL_TAG },
  breakeven_stop:    { label: 'BE',    cls: NEUTRAL_TAG },
  stop_loss_initial: { label: 'SL',    cls: NEUTRAL_TAG },
  stop_loss:         { label: 'SL',    cls: NEUTRAL_TAG },
  sar_reversal:      { label: 'SAR',   cls: NEUTRAL_TAG },
}

function ReasonBadge({ reason }: { reason: string | null }) {
  const r = reason ? REASON_MAP[reason] : null
  if (!r) return <span className="text-muted text-xs">{reasonFr(reason)}</span>
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${r.cls}`}>
      {r.label}
    </span>
  )
}

// `limiteMobile`: rows past it are hidden below sm only (a computer sees them
// all). StrategyDetail owns the « Voir les N derniers » button that lifts it.
export default function TradesTable({ trades, limiteMobile }: { trades: Trade[]; limiteMobile?: number }) {
  if (trades.length === 0) {
    return <p className="text-muted text-sm py-6 text-center">Aucun trade pour le moment.</p>
  }
  const hiddenOnPhone = (i: number) => limiteMobile !== undefined && i >= limiteMobile
  const pnlCls = (pnl: number) => (pnl >= 0 ? 'text-positive' : 'text-negative')
  return (
    <>
      {/* Phone: one row per trade, date and asset on the left, result on the right.
          The five-column table needed 325 px inside a 292 px card (counter-audit O-M2). */}
      <ul data-testid="trades-list-mobile" className="sm:hidden divide-y divide-border/50">
        {trades.map((t, i) => (
          <li key={t.id} className={`grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1 py-2${
            hiddenOnPhone(i) ? ' hidden' : ''}`}>
            <span className="font-mono text-sm">{t.asset}</span>
            <span className={`text-right font-mono text-sm font-semibold whitespace-nowrap ${pnlCls(t.pnl)}`}>
              {fmtEur(t.pnl)}
            </span>
            <span className="flex items-center gap-2 text-xs text-muted">
              <span className="font-mono">{shortDatePadded(t.closed_at)}</span>
              <span className={`px-1.5 py-0.5 rounded ${NEUTRAL_TAG}`}>{t.side}</span>
            </span>
            <span className="justify-self-end"><ReasonBadge reason={t.reason} /></span>
          </li>
        ))}
      </ul>

      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted text-xs uppercase tracking-wide">
              <th className="text-left py-2 pr-4">Date</th>
              <th className="text-left py-2 pr-4">Actif</th>
              <th className="text-left py-2 pr-4">Direction</th>
              <th className="text-right py-2 pr-4">P&amp;L</th>
              <th className="text-left py-2">Raison</th>
            </tr>
          </thead>
          <tbody>
            {trades.map(t => (
              <tr key={t.id} className="border-b border-border/50 hover:bg-card/50 transition-colors">
                <td className="py-2 pr-4 text-muted font-mono text-xs">
                  {shortDatePadded(t.closed_at)}
                </td>
                <td className="py-2 pr-4 font-mono">{t.asset}</td>
                <td className="py-2 pr-4">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${NEUTRAL_TAG}`}>
                    {t.side}
                  </span>
                </td>
                <td className={`py-2 pr-4 text-right font-mono font-semibold whitespace-nowrap ${pnlCls(t.pnl)}`}>
                  {fmtEur(t.pnl)}
                </td>
                <td className="py-2"><ReasonBadge reason={t.reason} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
