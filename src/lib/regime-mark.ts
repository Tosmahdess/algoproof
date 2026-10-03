// src/lib/regime-mark.ts
//
// The small drawn mark before a regime's word: a full disc for real money, a
// hollow circle for a simulation, a dotted circle for a backtest. It replaced the
// Unicode glyphs ● ○ ◌ (finitions of the « registre des décisions » redesign,
// 2026-10-03): a glyph renders in whatever font the OS falls back to, a drawn mark
// renders the same everywhere, in the stroke of the site's other icons. The mark
// redoubles the word and the badge's border; it never carries the regime alone.
//
// One geometry, two renderers: StatusBadge (React) and the embed card (an HTML
// string, src/lib/embed-card.ts).
import type { BotStatus } from '@/lib/types'

export interface RegimeMark {
  /** Full disc (true) or outline only. */
  filled: boolean
  /** stroke-dasharray of the outline, null for a continuous line. */
  dash: string | null
}

export const MARK_VIEWBOX = '0 0 12 12'
export const MARK_RADIUS = 4.25
export const MARK_STROKE = 1.5

export const REGIME_MARK: Record<BotStatus, RegimeMark | null> = {
  live: { filled: true, dash: null },
  paper: { filled: false, dash: null },
  // Round caps on near-zero dashes: ten dots around the circle.
  backtest: { filled: false, dash: '0.01 2.67' },
  frozen: null,
  archived: null,
}

/** The mark as an SVG string, for documents written without React. */
export function regimeMarkSvg(status: BotStatus, size: number): string {
  const m = REGIME_MARK[status]
  if (!m) return ''
  return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="${MARK_VIEWBOX}" style="flex:none">`
    + `<circle cx="6" cy="6" r="${MARK_RADIUS}" fill="${m.filled ? 'currentColor' : 'none'}" `
    + `stroke="currentColor" stroke-width="${MARK_STROKE}"`
    + (m.dash ? ` stroke-dasharray="${m.dash}" stroke-linecap="round"` : '')
    + '/></svg>'
}
