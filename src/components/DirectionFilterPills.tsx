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
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
      {PILLS.map(p => {
        const active = p.key === value
        const count = p.key === 'long' ? longCount : p.key === 'short' ? shortCount : undefined
        return (
          <button
            key={p.key}
            onClick={() => onChange(p.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              active
                ? p.key === 'long'
                  ? 'bg-positive/15 text-positive'
                  : p.key === 'short'
                  ? 'bg-negative/15 text-negative'
                  : 'bg-foreground text-background'
                : 'text-muted hover:text-foreground'
            }`}
          >
            {p.label}
            {count !== undefined && <span className="ml-1 text-[10px] opacity-70">({count})</span>}
          </button>
        )
      })}
    </div>
  )
}
