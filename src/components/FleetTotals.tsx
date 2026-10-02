// « La flotte » opens on its two totals (lot 4 of the design audit, 2026-09-25,
// conception §5.2), each with its denominator: bots and trades. Real money and
// simulation never fuse (R1), and the sentence under them says so. They replace
// the two « 96 / 3 » tiles (the home already counts the fleet) and « Le bilan »
// (whose day table now folds, see FleetJournal).
//
// Server component: it receives the aggregate and two counts, never the filter
// state, so no filter has a prop path to it (the stage-0 invariant of this page).
//
// Refonte « registre », lot 4 (2026-10-02): two columns between rules, the
// ledger's grammar, no card. Still two figures side by side, never one.
import type { FleetAggregate } from '@/lib/fleet-aggregate'
import { fmtEur, frNumber } from '@/lib/display'

function Total({ testId, label, amount, bots, trades, note, className = '' }: {
  testId: string; label: string; amount: number; bots: number; trades: number; note: string; className?: string
}) {
  const tone = amount < 0 ? 'text-negative' : amount > 0 ? 'text-positive' : 'text-foreground'
  return (
    <div data-testid={testId} className={`min-w-0 py-4 sm:py-5 ${className}`}>
      <p className="text-sm font-semibold">{label}</p>
      <p className={`tabular-nums text-2xl sm:text-4xl font-medium leading-tight mt-1 ${tone}`}>{fmtEur(amount)}</p>
      <p className="text-xs text-muted mt-1.5">
        <span className="tabular-nums text-foreground">{frNumber(bots, 0)}</span> bots ·{' '}
        <span className="tabular-nums text-foreground">{frNumber(trades, 0)}</span> trades
        <span className="hidden sm:inline"> · {note}</span>
      </p>
    </div>
  )
}

export default function FleetTotals({ aggregate, liveCount, paperCount }: {
  aggregate: FleetAggregate; liveCount: number; paperCount: number
}) {
  return (
    <section data-testid="fleet-totals" aria-label="Les deux totaux">
      <div className="grid grid-cols-2 border-y border-border">
        <Total className="pr-4 sm:pr-6" testId="fleet-total-real" label="Argent réel" amount={aggregate.totalPnlReal}
               bots={liveCount} trades={aggregate.tradesReal} note="depuis les premiers trades en capital réel" />
        <Total className="border-l border-border pl-4 sm:pl-6" testId="fleet-total-labo" label="Simulation" amount={aggregate.totalPnlLabo}
               bots={paperCount} trades={aggregate.tradesLabo} note="de l’argent qui n’existe pas, dépensé pour apprendre" />
      </div>
      <p className="text-xs text-muted mt-3">
        Je compte séparément l’argent réel et la simulation. Les filtres de la liste ne changent pas ces totaux.
      </p>
    </section>
  )
}
