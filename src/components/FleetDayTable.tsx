'use client'
// The day-by-day journal table from `FleetBalance` (stage 0), extracted so it
// can carry its own « Afficher plus » expand state without turning
// `FleetBalance` itself into a client component — the balance sheet must
// stay server-rendered and structurally unreachable by the filter pipeline
// (see FleetBalance.tsx). This component receives `rows` and NOTHING else:
// no aggregate object, no filter state, no callback from the register. A
// client component is still server-side rendered on first load; the earlier
// CSR-bailout problem on this route was specifically about
// `useSearchParams()` (see FleetRegister.tsx), which this never calls.
//
// A fleet with months of history makes `aggregate.rows` a very long table on
// a phone, so only the first 7 rows (already newest-first) show by default.
import { useState } from 'react'
import type { DayRow } from '@/lib/fleet-aggregate'
import { fmtEur } from '@/lib/display'

const VISIBLE_ROWS = 7

export default function FleetDayTable({ rows }: { rows: DayRow[] }) {
  const [expanded, setExpanded] = useState(false)
  const hiddenCount = Math.max(0, rows.length - VISIBLE_ROWS)
  const visibleRows = expanded ? rows : rows.slice(0, VISIBLE_ROWS)

  return (
    <>
      <div className="-mx-2 overflow-x-auto">
        {/* data-testid added fix round 2 (Minor): the headline totals above
            and this table's cells can coincide in value — tests scope to
            this table specifically rather than the whole stage-0 section to
            stay meaningful. */}
        <table data-testid="fleet-balance-table" className="w-full text-xs min-w-[480px]">
          <thead>
            <tr className="text-muted uppercase tracking-wider border-b border-border">
              <th className="px-2 py-2 text-left">Date</th>
              <th className="px-2 py-2 text-right">Trades</th>
              <th className="px-2 py-2 text-right">P&amp;L réel</th>
              <th className="px-2 py-2 text-right">P&amp;L labo</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(row => (
              <tr key={row.date} className="border-b border-border/40 font-mono">
                <td className="px-2 py-1.5">{row.dateFr}</td>
                <td className="px-2 py-1.5 text-right">{row.trades}</td>
                <td className={`px-2 py-1.5 text-right ${row.pnlReal >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {fmtEur(row.pnlReal)}
                </td>
                <td className={`px-2 py-1.5 text-right ${row.pnlLabo >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {fmtEur(row.pnlLabo)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="mt-3 text-xs text-accent underline"
        >
          {expanded
            ? 'Afficher moins'
            : `Afficher plus (${hiddenCount} jour${hiddenCount > 1 ? 's' : ''})`}
        </button>
      )}
    </>
  )
}
