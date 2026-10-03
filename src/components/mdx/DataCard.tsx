// src/components/mdx/DataCard.tsx
//
// One measured slice in an article: a label, an optional line under it, and its
// figures. Finitions of the « registre des décisions » redesign (2026-10-03): the
// card is a surface with a full 1 px rule, like every article box, no longer a
// border on its left side coloured by the sign of its last figure; the figure
// labels are in sentence case under each figure, no tracked capitals. A figure
// still takes the loss colour from its own sign (statColor.ts).
// Pinned by tests/components/mdx/encadres.test.tsx.
import type { ReactNode } from 'react'
import { BOX } from './box'
import { detectSign, valueColor } from './statColor'

function parseMetrics(raw: string): Array<{ label: string; value: string }> {
  return raw.split('|').map(segment => {
    const idx = segment.indexOf(':')
    if (idx === -1) return { label: '', value: segment.trim() }
    return {
      label: segment.slice(0, idx).trim(),
      value: segment.slice(idx + 1).trim(),
    }
  })
}

function parseLabel(label: string): ReactNode[] {
  const parts = label.split(/`([^`]+)`/)
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <code
        key={i}
        className="font-mono text-xs bg-card-2 border border-border rounded px-1.5 py-0.5 text-foreground"
      >
        {part}
      </code>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

interface DataCardProps {
  label: string
  sub?: string
  metrics: string
  /** Accepted for the articles that pass it; the box no longer changes with it. */
  intent?: 'positive' | 'negative' | 'neutral'
}

export function DataCard({ label, sub, metrics }: DataCardProps) {
  const parsed = parseMetrics(metrics)

  return (
    <div className={BOX}>
      <div className="text-sm text-foreground font-medium">{parseLabel(label)}</div>
      {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
      <div className="flex flex-wrap gap-x-6 gap-y-3 mt-3">
        {parsed.map((m, i) => {
          const sign = detectSign(m.value)
          return (
            <div key={i}>
              <div
                className={`tabular-nums text-xl font-semibold ${valueColor[sign]}`}
              >
                {m.value}
              </div>
              {m.label && (
                <div className="text-xs text-muted">
                  {m.label}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface DataCardGroupProps {
  children: ReactNode
}

export function DataCardGroup({ children }: DataCardGroupProps) {
  return (
    <div className="not-prose my-8 flex flex-col gap-3">{children}</div>
  )
}
