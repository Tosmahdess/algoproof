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
//
// FIX (layout, day table pagination): the table itself now lives in
// `FleetDayTable`, a small client component that owns its own « Afficher
// plus » expand state. `FleetBalance` stays server, passes it `rows` and
// nothing else, and this file never needs `'use client'` for a collapse
// toggle that has nothing to do with the balance sheet's own numbers.
import type { FleetAggregate } from '@/lib/fleet-aggregate'
import { fmtEur } from '@/lib/display'
import FleetDayTable from '@/components/FleetDayTable'

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
        <div className="mt-6">
          <FleetDayTable rows={aggregate.rows} />
        </div>
      )}
    </section>
  )
}
