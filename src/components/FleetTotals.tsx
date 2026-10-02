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
//
// Refonte finition (2026-10-02): each total names its base, as a label (« sur 3 ×
// 1 000 € », « sur 93 000 € »), never a sentence; the simulation's is the sum of its
// bots' starting capitals. The figures leave the shop-window size for the size of a
// row's result, and a gain is ink like everywhere else (lot 1); a loss keeps its colour.
import type { FleetAggregate } from '@/lib/fleet-aggregate'
import { fmtEur, frNumber, NARROW_NBSP } from '@/lib/display'

const euros = (n: number) => `${frNumber(n, 0)}${NARROW_NBSP}€`

/** « sur 3 × 1 000 € » when every bot starts on the same capital, else their sum. */
export function baseLabel(capitals: readonly number[], opts: { sumOnly?: boolean } = {}): string | null {
  if (capitals.length === 0) return null
  const same = capitals.every(c => c === capitals[0])
  if (!opts.sumOnly && same && capitals.length > 1) return `sur ${frNumber(capitals.length, 0)} × ${euros(capitals[0])}`
  return `sur ${euros(capitals.reduce((a, c) => a + c, 0))}`
}

function Total({ testId, label, amount, base, bots, trades, note, className = '' }: {
  testId: string; label: string; amount: number; base: string | null; bots: number; trades: number; note: string; className?: string
}) {
  const tone = amount < 0 ? 'text-negative' : 'text-foreground'
  return (
    <div data-testid={testId} className={`min-w-0 py-4 sm:py-5 ${className}`}>
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
        <span className={`tabular-nums text-lg md:text-xl font-medium leading-tight whitespace-nowrap ${tone}`}>{fmtEur(amount)}</span>
        {base && <span data-testid={`${testId}-base`} className="text-xs text-muted tabular-nums whitespace-nowrap">{base}</span>}
      </p>
      <p className="text-xs text-muted mt-1.5">
        <span className="tabular-nums text-foreground">{frNumber(bots, 0)}</span> bots ·{' '}
        <span className="tabular-nums text-foreground">{frNumber(trades, 0)}</span> trades
        <span className="hidden sm:inline"> · {note}</span>
      </p>
    </div>
  )
}

export default function FleetTotals({ aggregate, liveCount, paperCount, bases }: {
  aggregate: FleetAggregate; liveCount: number; paperCount: number
  /** The starting capitals of each side's bots, for « sur … ». */
  bases?: { real: readonly number[]; labo: readonly number[] }
}) {
  return (
    <section data-testid="fleet-totals" aria-label="Les deux totaux">
      <div className="grid grid-cols-2 border-y border-border">
        <Total className="pr-4 sm:pr-6" testId="fleet-total-real" label="Argent réel" amount={aggregate.totalPnlReal}
               base={bases ? baseLabel(bases.real) : null}
               bots={liveCount} trades={aggregate.tradesReal} note="depuis les premiers trades en capital réel" />
        <Total className="border-l border-border pl-4 sm:pl-6" testId="fleet-total-labo" label="Simulation" amount={aggregate.totalPnlLabo}
               base={bases ? baseLabel(bases.labo, { sumOnly: true }) : null}
               bots={paperCount} trades={aggregate.tradesLabo} note="de l’argent qui n’existe pas, dépensé pour apprendre" />
      </div>
      <p className="text-xs text-muted mt-3">
        Je compte séparément l’argent réel et la simulation. Les filtres de la liste ne changent pas ces totaux.
      </p>
    </section>
  )
}
