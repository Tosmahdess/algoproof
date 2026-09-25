// « La flotte » opens on its two totals (lot 4 of the design audit, 2026-09-25,
// conception §5.2), each with its denominator: bots and trades. Real money and
// simulation never fuse (R1), and the sentence under them says so. They replace
// the two « 96 / 3 » tiles (the home already counts the fleet) and « Le bilan »
// (whose day table now folds, see FleetJournal).
//
// Server component: it receives the aggregate and two counts, never the filter
// state, so no filter has a prop path to it (the stage-0 invariant of this page).
import type { FleetAggregate } from '@/lib/fleet-aggregate'
import { fmtEur, frNumber } from '@/lib/display'

function Total({ testId, label, amount, bots, trades, note }: {
  testId: string; label: string; amount: number; bots: number; trades: number; note: string
}) {
  const tone = amount < 0 ? 'text-negative' : amount > 0 ? 'text-positive' : 'text-foreground'
  return (
    <div data-testid={testId} className="bg-card border border-border rounded-lg p-4 sm:p-5 min-w-0">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={`font-mono text-2xl sm:text-3xl font-medium leading-tight mt-1 ${tone}`}>{fmtEur(amount)}</p>
      <p className="text-xs text-muted mt-1.5">
        <span className="font-mono text-foreground">{frNumber(bots, 0)}</span> bots ·{' '}
        <span className="font-mono text-foreground">{frNumber(trades, 0)}</span> trades
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
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Total testId="fleet-total-real" label="Argent réel" amount={aggregate.totalPnlReal}
               bots={liveCount} trades={aggregate.tradesReal} note="depuis les premiers trades en capital réel" />
        <Total testId="fleet-total-labo" label="Simulation" amount={aggregate.totalPnlLabo}
               bots={paperCount} trades={aggregate.tradesLabo} note="de l’argent qui n’existe pas, dépensé pour apprendre" />
      </div>
      <p className="text-xs text-muted mt-2">
        Ces deux totaux ne se fusionnent jamais et ne bougent pas avec les filtres du registre.
      </p>
    </section>
  )
}
