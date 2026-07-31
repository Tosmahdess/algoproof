'use client'
// The filter controls. They live visually BELOW the balance sheet so the
// relationship "these filters drive the register, not the balance" reads
// without explanation.
//
// Every option carries its count. That is the primary zero-result prevention
// mechanism: a visitor never selects a combination that cannot exist.
//
// Only classes declared in tailwind.config.ts theme.extend.colors are used
// here. Tailwind emits no rule for an undeclared colour and warns about
// nothing, so `bg-bg`, `bg-card`, `text-muted`, `border-border` and
// `bg-accent` are the vocabulary; `bg-background` does not exist.
import { FAMILY_ORDER, familyLabel, type Family } from '@/lib/families'
import {
  VENUE_ORDER, venueLabel, type FleetFilterState, type OptionCounts,
} from '@/lib/bot-filters'

interface Props {
  state: FleetFilterState
  counts: OptionCounts
  activeCount: number
  onToggleFamily: (f: Family) => void
  onToggleVenue: (v: (typeof VENUE_ORDER)[number]) => void
  onReset: () => void
}

function Pill({ label, count, active, onClick }: {
  label: string; count: number; active: boolean; onClick: () => void
}) {
  // FIX (brief bug, flagged in task-6-report.md): the brief's verbatim code set
  // the native `disabled` attribute on a zero-count option. In FIXTURE_FLEET no
  // register (non-live) bot runs on Kraken, so that pill is at 0 from the very
  // first render — permanently unclickable, and jsdom (like real browsers)
  // never dispatches a click to a disabled control. That makes describeEmptyResult's
  // own worked example (two independently-restrictive facets, e.g. family=carry
  // AND venue=kraken, each narrowing to a different single bot) unreachable
  // through this bar, which defeats the reason that empty-state escape hatch
  // exists. The zero count still discourages the pick — via dimmed opacity —
  // but the click itself must go through.
  //
  // FIX (final review, Minor): `cursor-not-allowed` went with the `disabled`
  // attribute and should have left with it. The same commit deliberately made
  // this pill clickable, so a "you can't click this" cursor was simply false.
  // `opacity-40` stays: dimming says "nothing here", which is true.
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'px-3 py-1.5 text-xs font-mono border rounded transition-colors',
        active ? 'bg-accent text-bg border-accent' : 'bg-bg text-muted border-border hover:text-white',
        count === 0 && !active ? 'opacity-40' : '',
      ].join(' ')}
    >
      {label} ({count})
    </button>
  )
}

export default function FleetFilterBar({
  state, counts, activeCount, onToggleFamily, onToggleVenue, onReset,
}: Props) {
  return (
    <details data-testid="fleet-filters" className="bg-card border border-border rounded-lg">
      {/* The summary must remain a SINGLE text-bearing node: the test asserts it
          as one string, and a nested span would match getByText twice. A
          `display:` on a <summary> removes the native disclosure triangle, which
          on a block closed by default is the only affordance that says it opens —
          so the badge is inline-block, never flex. */}
      <summary className="cursor-pointer px-4 py-3 text-xs uppercase tracking-wider text-muted">
        {activeCount === 0 ? 'Filtrer la flotte' : `Filtrer la flotte — ${activeCount} filtre(s) actif(s)`}
      </summary>

      <div className="px-4 pb-4 space-y-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted mb-2">Famille</div>
          <div className="flex flex-wrap gap-2">
            {FAMILY_ORDER.map(f => (
              <Pill
                key={f}
                label={familyLabel(f)}
                count={counts.family[f] ?? 0}
                active={state.family.includes(f)}
                onClick={() => onToggleFamily(f)}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wider text-muted mb-2">Où ça tourne</div>
          <div className="flex flex-wrap gap-2">
            {VENUE_ORDER.map(v => (
              <Pill
                key={v}
                label={venueLabel(v)}
                count={counts.venue[v] ?? 0}
                active={state.venue.includes(v)}
                onClick={() => onToggleVenue(v)}
              />
            ))}
          </div>
        </div>

        {activeCount > 0 && (
          <button type="button" onClick={onReset} className="text-xs text-accent underline">
            Tout effacer
          </button>
        )}
      </div>
    </details>
  )
}
