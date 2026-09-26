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

export default function DirectionFilterPills({ value, onChange, longCount, shortCount }: Props) {
  return (
    <div className="inline-flex items-center gap-1 rounded-md bg-card-2">
      {PILLS.map(p => {
        const active = p.key === value
        const count = p.key === 'long' ? longCount : p.key === 'short' ? shortCount : undefined
        return (
          <button
            key={p.key}
            onClick={() => onChange(p.key)}
            aria-pressed={active}
            className={`h-10 px-3 rounded-md text-xs font-medium transition-colors ${
              active
                ? 'bg-foreground text-bg'
                : 'bg-card-2 text-muted hover:text-foreground'
            }`}
          >
            {p.label}
            {count !== undefined && <span className="ml-1 text-xs opacity-70">({count})</span>}
          </button>
        )
      })}
    </div>
  )
}
