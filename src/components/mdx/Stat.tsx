// src/components/mdx/Stat.tsx
//
// Highlight a key number with optional change/delta and subtext.
// Designed to be inline-friendly: a row of <Stat>s can fit naturally in prose.
//
// Usage in MDX (single):
//   <Stat label="PF moyen IS" value="1.18" change="−0.39" subtext="vs OOS 0.79" />
//
// Usage in MDX (row):
//   <StatRow>
//     <Stat label="Trades" value="216" />
//     <Stat label="Configs GO_COND" value="5" subtext="sur 135 testées" />
//     <Stat label="OOS holding" value="0/5" change="−100 %" />
//   </StatRow>

import type { ReactNode } from 'react'

interface StatProps {
  label: string
  value: string | number
  change?: string
  subtext?: string
}

function detectChangeColor(s: string | undefined): string {
  if (!s) return 'text-muted'
  const trimmed = s.trim()
  if (/^[+]/.test(trimmed)) return 'text-positive'
  if (/^[−–-]/.test(trimmed)) return 'text-negative'
  return 'text-muted'
}

export function Stat({ label, value, change, subtext }: StatProps) {
  const changeColor = detectChangeColor(change)
  return (
    <div className="not-prose flex-1 min-w-[140px] border-l-2 border-border pl-4 py-1">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted font-semibold mb-1">
        {label}
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-foreground">
          {value}
        </span>
        {change && (
          <span className={`font-mono tabular-nums text-sm font-medium ${changeColor}`}>
            {change}
          </span>
        )}
      </div>
      {subtext && (
        <div className="text-xs text-muted mt-1">{subtext}</div>
      )}
    </div>
  )
}

interface StatRowProps {
  children: ReactNode
}

export function StatRow({ children }: StatRowProps) {
  return (
    <div className="not-prose my-8 flex flex-wrap gap-x-2 gap-y-4 border-y border-border py-5">
      {children}
    </div>
  )
}
