import type { ReactNode } from 'react'

function detectSign(s: string): 'positive' | 'negative' | 'neutral' {
  const trimmed = s.trim()
  if (/^[+]/.test(trimmed)) return 'positive'
  if (/^[−–-]\s*\d/.test(trimmed)) return 'negative'
  return 'neutral'
}

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
        className="font-mono text-[0.85em] bg-card border border-border/80 rounded px-1.5 py-0.5 text-accent/90"
      >
        {part}
      </code>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

const intentStyles = {
  positive: { border: 'border-l-positive/60', bg: 'bg-positive/[0.03]' },
  negative: { border: 'border-l-negative/60', bg: 'bg-negative/[0.03]' },
  neutral:  { border: 'border-l-muted/40',    bg: 'bg-card/40' },
}

const valueColor = {
  positive: 'text-positive',
  negative: 'text-negative',
  neutral:  'text-foreground',
}

interface DataCardProps {
  label: string
  sub?: string
  metrics: string
  intent?: 'positive' | 'negative' | 'neutral'
}

export function DataCard({ label, sub, metrics, intent }: DataCardProps) {
  const parsed = parseMetrics(metrics)
  const resolvedIntent =
    intent ?? (parsed.length > 0 ? detectSign(parsed[parsed.length - 1].value) : 'neutral')
  const s = intentStyles[resolvedIntent]

  return (
    <div className={`not-prose border-l-2 ${s.border} ${s.bg} rounded-r-md px-5 py-4`}>
      <div className="text-sm text-foreground font-medium">{parseLabel(label)}</div>
      {sub && <div className="text-[11px] text-muted mt-0.5">{sub}</div>}
      <div className="flex flex-wrap gap-6 mt-3">
        {parsed.map((m, i) => {
          const sign = detectSign(m.value)
          return (
            <div key={i}>
              <div
                className={`font-mono tabular-nums text-xl font-semibold ${valueColor[sign]}`}
              >
                {m.value}
              </div>
              {m.label && (
                <div className="text-[9px] uppercase tracking-[0.15em] text-muted font-semibold">
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
