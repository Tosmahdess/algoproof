'use client'
// The filter controls of the register. Every option carries its count, so a
// visitor never selects a combination that cannot exist.
//
// Lot 4 of the design audit (2026-09-25, conception §5.2): the timeframes,
// which used to head one table each (« H4 : 55 stratégies »), are a facet here.
// The register is one table for every horizon, and a visitor who wants only
// the H1 bots filters for them.
//
// 2026-09-30 (user, on a phone): ONE list per filter, and no fold of its own.
// The pills wrapped over six lines, and this bar sat in a <details> INSIDE
// StickyFilterBar's own phone fold, so reaching a filter took two taps on two
// successive « Filtres » lines. A native <select> opens the phone's own picker
// and the four lists hold on one or two lines; StickyFilterBar stays the only
// drilldown. A list picks ONE value: a URL carrying several (older shared
// links, hand-edited) still filters on all of them, and the list says how many.
//
// Only classes declared in tailwind.config.ts theme.extend.colors are used
// here: Tailwind emits no rule for an undeclared colour and warns about nothing.
import { FAMILY_ORDER, familyLabel, type Family } from '@/lib/families'
import type { FleetFilterState, OptionCounts, SortKey } from '@/lib/bot-filters'
import { tfRank } from '@/lib/fleet-grouping'
import { SORT_LABELS } from '@/lib/fleet-sort'
import type { ReactNode } from 'react'

interface Props {
  state: FleetFilterState
  counts: OptionCounts
  activeCount: number
  onFamily: (f: Family | null) => void
  onTimeframe: (tf: string | null) => void
  onSide: (side: 'all' | 'long' | 'short') => void
  onSort: (sort: SortKey) => void
  onReset: () => void
}

// The sorts a visitor is offered. History stays the default (fleet-sort.ts
// header); the performance sorts are the ones asked for, best first.
const SORTS: readonly SortKey[] = ['proven', 'profit_factor', 'pct', 'trades']
const SORT_SHORT: Partial<Record<SortKey, string>> = {
  proven: 'Historique',
  profit_factor: 'Facteur de profit',
}

// A value the list cannot show (several families from an old URL) gets its own
// selected option instead of silently displaying « Toutes ».
const MULTI = '__multi__'

function Field({ label, value, onChange, children }: {
  label: string; value: string; onChange: (v: string) => void; children: ReactNode
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-10 w-full min-w-0 rounded-md border border-border-strong bg-card px-2 text-base sm:text-xs tabular-nums text-foreground focus:border-accent"
      >
        {children}
      </select>
    </label>
  )
}

export default function FleetFilterBar({
  state, counts, activeCount, onFamily, onTimeframe, onSide, onSort, onReset,
}: Props) {
  const timeframes = Object.keys(counts.timeframe).sort((a, z) => tfRank(a) - tfRank(z) || a.localeCompare(z))
  const one = (list: string[]) => (list.length === 0 ? '' : list.length === 1 ? list[0] : MULTI)
  // A zero-count option stays selectable (never `disabled`): the empty-state
  // message that names the responsible filter must stay reachable.
  const opt = (value: string, label: string, n: number) => (
    <option key={value} value={value}>{`${label} (${n})`}</option>
  )

  return (
    <div data-testid="fleet-filters" className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:max-w-4xl">
        <Field label="Famille" value={one(state.family)} onChange={v => onFamily(v && v !== MULTI ? (v as Family) : null)}>
          <option value="">Toutes</option>
          {state.family.length > 1 && <option value={MULTI}>{`${state.family.length} familles`}</option>}
          {FAMILY_ORDER.map(f => opt(f, familyLabel(f), counts.family[f] ?? 0))}
        </Field>

        <Field label="Horizon" value={one(state.timeframe)} onChange={v => onTimeframe(v && v !== MULTI ? v : null)}>
          <option value="">Tous</option>
          {state.timeframe.length > 1 && <option value={MULTI}>{`${state.timeframe.length} horizons`}</option>}
          {timeframes.map(tf => opt(tf, tf, counts.timeframe[tf] ?? 0))}
        </Field>

        {/* Side is a SLICE (bot-filters.ts header): every row stays, its stats
            are recomputed on that side. */}
        <Field label="Sens des trades" value={state.side} onChange={v => onSide(v as 'all' | 'long' | 'short')}>
          <option value="all">Les deux</option>
          {opt('long', 'Long', counts.side.long)}
          {opt('short', 'Short', counts.side.short)}
        </Field>

        <Field label="Trier par" value={state.sort} onChange={v => onSort(v as SortKey)}>
          {/* A sort from an old URL that the list no longer offers still shows. */}
          {!SORTS.includes(state.sort) && <option value={state.sort}>{SORT_LABELS[state.sort]}</option>}
          {SORTS.map(k => <option key={k} value={k}>{SORT_SHORT[k] ?? SORT_LABELS[k]}</option>)}
        </Field>
      </div>

      {activeCount > 0 && (
        <button type="button" onClick={onReset} className="hidden min-h-10 text-sm text-accent underline lg:inline-flex lg:items-center">
          Tout effacer
        </button>
      )}
    </div>
  )
}
