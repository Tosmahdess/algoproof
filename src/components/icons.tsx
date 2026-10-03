// src/components/icons.tsx
//
// The site's few drawn icons. Unicode glyphs (● ○ ◌ ☆ ★) stood in for them until
// 2026-10-03; each OS drew those from its own fallback font. Every icon here is
// decorative (`aria-hidden`): the word beside it, or the control's accessible
// name, carries the meaning.
import type { BotStatus } from '@/lib/types'
import { MARK_RADIUS, MARK_STROKE, MARK_VIEWBOX, REGIME_MARK } from '@/lib/regime-mark'

/** Full disc, hollow circle or dotted circle before a regime's word (src/lib/regime-mark.ts). */
export function RegimeMark({ status, className = 'h-2.5 w-2.5' }: { status: BotStatus; className?: string }) {
  const m = REGIME_MARK[status]
  if (!m) return null
  return (
    <svg aria-hidden="true" data-mark="regime" viewBox={MARK_VIEWBOX} className={`shrink-0 ${className}`}>
      <circle cx="6" cy="6" r={MARK_RADIUS} fill={m.filled ? 'currentColor' : 'none'}
        stroke="currentColor" strokeWidth={MARK_STROKE}
        {...(m.dash ? { strokeDasharray: m.dash, strokeLinecap: 'round' as const } : {})} />
    </svg>
  )
}

/** The favourite star: outlined, filled when the item is a favourite. */
export function StarIcon({ on, className = 'h-[18px] w-[18px]' }: { on: boolean; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`shrink-0 ${className}`}
      fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round">
      <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z" />
    </svg>
  )
}
