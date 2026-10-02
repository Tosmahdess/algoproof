'use client'

import type { DirectionFilter } from '@/lib/stats'

interface Props {
  value: DirectionFilter
  onChange: (next: DirectionFilter) => void
  longCount?: number
  shortCount?: number
}

const PILLS: Array<{ key: DirectionFilter; label: string }> = [
  { key: 'all',   label: 'Tous' },
  { key: 'long',  label: 'Long' },
  { key: 'short', label: 'Short' },
]

// Refonte « Le registre des décisions », lot 3 (2026-10-02). A side with no trade is
// not a choice: its pill is disabled, so a spot bot no longer offers « Short (0) » and
// its empty figures (audit 2026-10, constat 31). Counts are full ink, no opacity
// (constat 33). A pill is a 44 px control with a contour, pressed state in words too.
export default function DirectionFilterPills({ value, onChange, longCount, shortCount }: Props) {
  return (
    <div role="group" aria-label="Sens des trades" className="inline-flex items-center gap-1">
      {PILLS.map(p => {
        const active = p.key === value
        const count = p.key === 'long' ? longCount : p.key === 'short' ? shortCount : undefined
        const empty = count === 0 && !active
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => onChange(p.key)}
            aria-pressed={active}
            disabled={empty}
            className={`min-h-11 px-3 rounded border text-sm font-medium transition-colors ${
              active
                ? 'border-accent bg-card-2 text-foreground'
                : 'border-border-strong text-foreground hover:bg-card-2'
            } disabled:cursor-not-allowed disabled:border-border disabled:text-muted disabled:hover:bg-transparent`}
          >
            {p.label}
            {count !== undefined && <span className="ml-1 tabular-nums">{`(${count})`}</span>}
          </button>
        )
      })}
    </div>
  )
}
