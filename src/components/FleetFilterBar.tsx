'use client'
// The filter controls of the register. Every option carries its count, so a
// visitor never selects a combination that cannot exist.
//
// Lot 4 of the design audit (2026-09-25, conception §5.2): the timeframes,
// which used to head one table each (« H4 : 55 stratégies »), are a facet here.
// The register is one table for every horizon, and a visitor who wants only
// the H1 bots filters for them.
//
// Only classes declared in tailwind.config.ts theme.extend.colors are used
// here: Tailwind emits no rule for an undeclared colour and warns about nothing.
import { FAMILY_ORDER, familyLabel, type Family } from '@/lib/families'
import type { FleetFilterState, OptionCounts } from '@/lib/bot-filters'
import { tfRank } from '@/lib/fleet-grouping'

interface Props {
  state: FleetFilterState
  counts: OptionCounts
  activeCount: number
  onToggleFamily: (f: Family) => void
  onToggleTimeframe: (tf: string) => void
  onToggleSide: (side: 'long' | 'short') => void
  onReset: () => void
}

function Pill({ label, count, active, onClick }: {
  label: string; count: number; active: boolean; onClick: () => void
}) {
  // A zero-count option stays clickable (dimmed, never `disabled`): the
  // empty-state message that names the responsible filter must stay reachable.
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'inline-flex items-center h-10 px-3 text-xs font-mono border rounded-md transition-colors',
        active ? 'bg-accent text-bg border-accent' : 'bg-bg text-muted border-border hover:text-foreground hover:border-border-strong',
        count === 0 && !active ? 'opacity-40' : '',
      ].join(' ')}
    >
      {label} ({count})
    </button>
  )
}

export default function FleetFilterBar({
  state, counts, activeCount, onToggleFamily, onToggleTimeframe, onToggleSide, onReset,
}: Props) {
  const timeframes = Object.keys(counts.timeframe).sort((a, z) => tfRank(a) - tfRank(z) || a.localeCompare(z))
  return (
    <details data-testid="fleet-filters" className="bg-card border border-border rounded-lg">
      {/* One text-bearing node in the summary: the test reads it as one string. */}
      <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-muted">
        {activeCount === 0 ? 'Filtrer la flotte' : `Filtrer la flotte : ${activeCount} filtre(s) actif(s)`}
      </summary>

      <div className="px-4 pb-4 space-y-4">
        <div>
          <div className="text-xs font-semibold text-muted mb-2">Famille</div>
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

        {timeframes.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted mb-2">Horizon</div>
            <div className="flex flex-wrap gap-2">
              {timeframes.map(tf => (
                <Pill
                  key={tf}
                  label={tf}
                  count={counts.timeframe[tf] ?? 0}
                  active={state.timeframe.includes(tf)}
                  onClick={() => onToggleTimeframe(tf)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Side is a SLICE (bot-filters.ts header): every row stays, its stats are
            recomputed on that side. Two pills, mutually exclusive. */}
        <div>
          <div className="text-xs font-semibold text-muted mb-2">Sens des trades</div>
          <div className="flex flex-wrap gap-2">
            {(['long', 'short'] as const).map(side => (
              <Pill
                key={side}
                label={side === 'long' ? 'Long' : 'Short'}
                count={counts.side[side]}
                active={state.side === side}
                onClick={() => onToggleSide(side)}
              />
            ))}
          </div>
        </div>

        {activeCount > 0 && (
          <button type="button" onClick={onReset} className="text-sm text-accent underline">
            Tout effacer
          </button>
        )}
      </div>
    </details>
  )
}
