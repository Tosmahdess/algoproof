import { Trade } from '@/lib/types'
import { shortDatePadded } from '@/lib/format-date'
import { fmtEur, frNumber, NARROW_NBSP } from '@/lib/display'
import { exitReasonWords } from '@/lib/trade-ledger'
import { sideLabel } from '@/lib/stats'

// Refonte « Le registre des décisions », lot 3 (2026-10-02): the register of closed
// trades. Columns « Date / Actif / Résultat du trade / Cumul après ce trade / Motif de
// sortie », oldest to newest, so the addition reads downwards; the exit reason in words
// (« Stop », « Objectif 2 »), neutral: a stop can close a winning trade (D066). The
// cumul is handed in, computed on the whole history (cumulativeAfterEach), never rebuilt
// from the rows shown. On a phone a row becomes a small block.

export interface TradesTotal {
  /** « Total de ces 20 trades », or « Total de la sélection » under a filter. */
  label: string
  sum: number
  /** The cumul after the last row, or null when it would read as a balance it is not
   *  (a filtered selection). */
  cumul: number | null
}

const money = (n: number) => `${frNumber(n, 2)}${NARROW_NBSP}€`
const pnlCls = (pnl: number) => (pnl < 0 ? 'text-negative' : 'text-foreground')

// `limiteMobile`: on a phone only the most recent rows show (the last ones, the order
// being oldest first); a computer sees them all. StrategyDetail owns the « Voir les N
// derniers » button that lifts it.
export default function TradesTable({ trades, limiteMobile, cumul, total }: {
  /** Newest first, as the fiche receives them. */
  trades: Trade[]
  limiteMobile?: number
  cumul?: Map<string, number>
  total?: TradesTotal
}) {
  if (trades.length === 0) {
    return <p className="text-muted text-sm py-6">Aucun trade pour le moment.</p>
  }
  const rows = [...trades].reverse()
  const hiddenOnPhone = (i: number) => limiteMobile !== undefined && i < rows.length - limiteMobile
  const cumulOf = (t: Trade) => cumul?.get(t.id)

  return (
    <>
      <ul data-testid="trades-list-mobile" className="sm:hidden border-t border-border">
        {rows.map((t, i) => {
          const c = cumulOf(t)
          return (
            <li key={t.id} className={`grid grid-cols-2 gap-x-3 gap-y-2 border-b border-border py-3 text-sm${
              hiddenOnPhone(i) ? ' hidden' : ''}`}>
              <span className="tabular-nums text-muted">{shortDatePadded(t.closed_at)}</span>
              <span className="text-right"><span className="font-mono">{t.asset}</span>{` · ${sideLabel(t.side).toLowerCase()}`}</span>
              <span>
                <span className="block text-xs text-muted">Résultat</span>
                <span className={`tabular-nums font-semibold whitespace-nowrap ${pnlCls(t.pnl)}`}>{fmtEur(t.pnl)}</span>
              </span>
              {c !== undefined ? (
                <span className="text-right">
                  <span className="block text-xs text-muted">Cumul</span>
                  <span className="tabular-nums whitespace-nowrap">{money(c)}</span>
                </span>
              ) : <span />}
              <span className="col-span-2 text-xs text-muted">{exitReasonWords(t.reason)}</span>
            </li>
          )
        })}
        {total && (
          <li data-testid="trades-total-mobile" className="grid grid-cols-2 gap-x-3 border-b-[3px] border-double border-border-strong py-3 text-sm font-semibold">
            <span className="col-span-2 font-normal text-muted">{total.label}</span>
            <span className={`tabular-nums whitespace-nowrap ${pnlCls(total.sum)}`}>{fmtEur(total.sum)}</span>
            {total.cumul !== null
              ? <span className="text-right tabular-nums whitespace-nowrap">{money(total.cumul)}</span>
              : <span />}
          </li>
        )}
      </ul>

      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="border-b border-border text-muted text-xs">
              <th scope="col" className="text-left font-medium py-3 pr-4">Date</th>
              <th scope="col" className="text-left font-medium py-3 pr-4">Actif</th>
              <th scope="col" className="text-right font-medium py-3 pr-4">Résultat du trade</th>
              {cumul && <th scope="col" className="text-right font-medium py-3 pr-4">Cumul après ce trade</th>}
              <th scope="col" className="text-left font-medium py-3">Motif de sortie</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(t => {
              const c = cumulOf(t)
              return (
                <tr key={t.id} className="border-b border-border">
                  <td className="py-3 pr-4 text-muted whitespace-nowrap">{shortDatePadded(t.closed_at)}</td>
                  <td className="py-3 pr-4">
                    <span className="font-mono">{t.asset}</span>
                    <span className="text-muted">{` · ${sideLabel(t.side).toLowerCase()}`}</span>
                  </td>
                  <td className={`py-3 pr-4 text-right font-semibold whitespace-nowrap ${pnlCls(t.pnl)}`}>{fmtEur(t.pnl)}</td>
                  {cumul && <td className="py-3 pr-4 text-right whitespace-nowrap">{c !== undefined ? money(c) : '—'}</td>}
                  <td className="py-3 text-muted">{exitReasonWords(t.reason)}</td>
                </tr>
              )
            })}
          </tbody>
          {total && (
            <tfoot>
              <tr data-testid="trades-total" className="border-b-[3px] border-double border-border-strong font-semibold">
                <td colSpan={2} className="py-3 pr-4">{total.label}</td>
                <td className={`py-3 pr-4 text-right whitespace-nowrap ${pnlCls(total.sum)}`}>{fmtEur(total.sum)}</td>
                {cumul && <td className="py-3 pr-4 text-right whitespace-nowrap">{total.cumul !== null ? money(total.cumul) : ''}</td>}
                <td className="py-3" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  )
}
