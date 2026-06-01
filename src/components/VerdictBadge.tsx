import type { Verdict } from '@/lib/types'

const MAP: Record<Verdict, { label: string; color: string; bg: string }> = {
  renforcer: { label: 'RENFORCER', color: '#3fb950', bg: 'rgba(63,185,80,0.12)' },
  maintenir: { label: 'MAINTENIR', color: '#f6c90e', bg: 'rgba(246,201,14,0.12)' },
  skip:      { label: 'PASSER',    color: '#ff4444', bg: 'rgba(255,68,68,0.12)' },
}

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const v = MAP[verdict]
  return (
    <span
      style={{ color: v.color, background: v.bg, border: `1px solid ${v.color}` }}
      className="inline-block rounded-md px-3 py-1 text-sm font-bold tracking-wide"
    >
      {v.label}
    </span>
  )
}
