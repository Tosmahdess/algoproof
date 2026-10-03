// src/lib/share-image.tsx
//
// Pieces shared by the images Satori draws (the share card /api/card/<slug>, a bot's
// social image, the site's social image): the regime badge with its drawn mark, the
// wordmark, and the spacing rule. Finitions of 2026-10-03; the rules are pinned by
// tests/app/share-images.test.tsx.
//
// Satori lays out every child of an element as its own run, and drew the site's
// no-break spaces (U+00A0 between thousands, U+202F before € and %) at an irregular
// width. So each line of text is ONE string, and the figures go through `plain`.
import type { BotStatus } from '@/lib/types'
import { MARK_RADIUS, MARK_STROKE, MARK_VIEWBOX, REGIME_MARK } from '@/lib/regime-mark'
import { SITE_COLORS as C } from '@/lib/site-colors'

/** The figures with ordinary spaces: the narrow no-break space before € and %, and
 *  the no-break space between groups of thousands. A no-break space anywhere else is
 *  deliberate (« n° 2 » in a bot's name) and stays. */
export function plain(s: string): string {
  return s.replace(/\u202f/g, ' ').replace(/(?<=\d)\u00a0(?=\d)/g, ' ')
}

const REGIME: Record<BotStatus, { word: string; edge: 'solid' | 'dashed' | 'dotted' }> = {
  live: { word: 'Argent réel', edge: 'solid' },
  paper: { word: 'Simulation', edge: 'dashed' },
  backtest: { word: 'Backtest', edge: 'dotted' },
  frozen: { word: 'Gelé', edge: 'solid' },
  archived: { word: 'Archivé', edge: 'solid' },
}

/** The regime as on the bot fiche: a drawn mark, its word, a full or dashed contour. */
export function RegimeBadge({ status, fontSize }: { status: BotStatus; fontSize: number }) {
  const r = REGIME[status]
  const m = REGIME_MARK[status]
  const mark = Math.round(fontSize * 0.75)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: Math.round(fontSize * 0.5),
      padding: `${Math.round(fontSize * 0.35)}px ${Math.round(fontSize * 0.75)}px`,
      border: `1px ${r.edge} ${C.borderStrong}`, borderRadius: 4,
      color: C.text, fontSize, fontWeight: 500,
    }}>
      {m && (
        <svg width={mark} height={mark} viewBox={MARK_VIEWBOX}>
          <circle cx="6" cy="6" r={MARK_RADIUS} fill={m.filled ? C.text : 'none'} stroke={C.text}
            strokeWidth={MARK_STROKE} {...(m.dash ? { strokeDasharray: m.dash, strokeLinecap: 'round' as const } : {})} />
        </svg>
      )}
      <span>{r.word}</span>
    </div>
  )
}

/** « Algo » in ink, « Proof » in the brand green: the only green of the images. */
export function Wordmark({ fontSize }: { fontSize: number }) {
  return (
    <div style={{ display: 'flex', fontSize, fontWeight: 700 }}>
      <span style={{ color: C.text }}>Algo</span>
      <span style={{ color: C.brand }}>Proof</span>
    </div>
  )
}
