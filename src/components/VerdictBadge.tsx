import type { Verdict } from '@/lib/types'

const MAP: Record<Verdict, { label: string; color: string; bg: string }> = {
  renforcer: { label: 'RENFORCER', color: 'var(--positive)', bg: 'rgba(63,185,80,0.12)' },
  maintenir: { label: 'MAINTENIR', color: 'var(--warning)', bg: 'rgba(246,201,14,0.12)' },
  skip:      { label: 'PASSER',    color: 'var(--negative)', bg: 'rgba(255,68,68,0.12)' },
}

// null = the verdict is gated behind the membership for this visitor (Task 7).
// Neutral chip, never a crash, never a blank box.
const GATED = { label: 'MEMBRES', color: 'var(--muted)', bg: 'rgba(136,136,136,0.12)' }

export function VerdictBadge({ verdict }: { verdict: Verdict | null }) {
  const v = verdict ? MAP[verdict] : GATED
  return (
    <span
      style={{ color: v.color, background: v.bg, border: `1px solid ${v.color}` }}
      className="inline-block rounded-md px-3 py-1 text-sm font-bold tracking-wide"
    >
      {v.label}
    </span>
  )
}
