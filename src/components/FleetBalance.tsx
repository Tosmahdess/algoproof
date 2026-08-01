// « La flotte » — stage 0, the balance sheet.
//
// Deliberately NOT a client component and NOT wrapped in `<Suspense>`: it
// renders directly in the server component tree so it is part of the
// prerendered HTML, structurally unreachable by anything downstream that
// reads useSearchParams(). Before this split, "the filters cannot touch the
// balance sheet" was enforced only by convention (a shared React tree, a
// test). Now it is enforced by the render boundary itself — this component
// never receives filter state, and FleetRegister never receives `aggregate`.
//
// Absorbing /performance into this page means absorbing its content, not
// just its totals: the day-by-day table below is the same journal the
// retired page showed, computed once in the server component and rendered
// here — never serialized to a client component that would otherwise ship
// the full row set to the browser and use none of it.
//
// FIX (final review, C2): the journal used to carry a single P&L column and a
// running Cumul column, BOTH fusing real money with laboratory simulation —
// two lines under the sentence that promises those two totals never fuse. And
// because the rows are newest-first, the very first Cumul cell was exactly
// « argent réel + laboratoire ». The day P&L is now split by cohort like the
// headline, and there is no cumulative column at all: the cumulative totals
// live above this table, already split.
//
// FIX (final whole-branch review, I7): « Taux de gain » and « F. profit » are
// gone with them. That fix split the P&L and killed the cumulative, and left
// these two standing one column to the LEFT, still accumulated across both
// cohorts — a day where the live bot loses and the laboratory wins printed a
// profit factor describing neither, directly under the sentence promising the
// two never fuse. Four columns now, Date · Trades · P&L réel · P&L labo, and
// each of them is true. Win rate and profit factor still exist where they mean
// something: on a bot's own fiche, over that bot's whole history.
import type { FleetAggregate } from '@/lib/fleet-aggregate'
import { fmtEur } from '@/lib/display'

export default function FleetBalance({ aggregate }: { aggregate: FleetAggregate }) {
  return (
    <section data-testid="fleet-balance" className="bg-card border border-border rounded-lg p-6">
      <h2 className="text-xs uppercase tracking-wider text-muted mb-4">Le bilan</h2>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="text-xs text-muted">Argent réel</div>
          <div className="text-xl font-mono">{fmtEur(aggregate.totalPnlReal)}</div>
        </div>
        <div>
          <div className="text-xs text-muted">Laboratoire · simulation</div>
          <div className="text-xl font-mono">{fmtEur(aggregate.totalPnlLabo)}</div>
        </div>
      </div>
      <p className="text-xs text-muted mt-4">
        {aggregate.totalTrades} trades depuis le début. Ces deux totaux ne se
        fusionnent jamais et ne bougent pas avec les filtres ci-dessous.
      </p>

      {aggregate.rows.length > 0 && (
        <div className="mt-6 -mx-2 overflow-x-auto">
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
              {aggregate.rows.map(row => (
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
      )}
    </section>
  )
}
