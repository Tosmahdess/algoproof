'use client'

// The state of the day on /intelligence, in one framed panel (refonte « Le registre des
// décisions », page Météo, 2026-10-03). It reads like the verdict panel of a bot fiche:
// the regime as its heading, the global score with its sign and its scale, the date of
// the reading; then, in the right column, what that state allows my bots today. It is the
// one framed panel of the page and it is never folded.
//
// Audit 2026-10: « score 14,5 » had no scale and « Longs Shorts » no label (n° 46); the
// pillar scores wore the gain and loss tokens the wrong way round (n° 9). The pillars left
// this panel for their own register under the chart, in ink with their sign.
//
// The panel stays a client component: the page is regenerated every half hour, the
// reading is fetched live so its age is the real one.
import { useEffect, useState } from 'react'
import { getLatestMiSnapshot } from '@/lib/queries'
import type { MiSnapshot } from '@/lib/types'
import { regimeFr, trendFr } from '@/lib/regime-labels'
import { fmtPct, frNumber } from '@/lib/display'
import { longDateTime } from '@/lib/format-date'
import { allowedSides, scaleText, scoreText } from '@/lib/mi-pillars'

// A calm market is not a gain: ink. The three other states speak with their word and
// the status ink of their tier; stress also takes the loss contour, as a crossed rule
// does on a bot fiche.
const TITLE_TONE: Record<string, string> = {
  GREEN: 'text-foreground',
  YELLOW: 'text-warning',
  ORANGE: 'text-severe',
  RED: 'text-negative',
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function freshness(snapshotAt: string): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(snapshotAt).getTime()) / 60000))
  return min < 120 ? `il y a ${min} min` : `il y a ${Math.round(min / 60)} h`
}

// What the state changes for the bots today, from is_safe alone (spec 5.4, lot 7).
// The substance of the weather is frozen: this is the gate's own answer, worded for
// a reader, not a new rule.
function todayForBots(snap: MiSnapshot): string {
  // « taille de position normale » was dropped on 2026-09-29: the snapshot carries no size,
  // and the sizing matrix can shrink positions while entries are open (audit remnant).
  if (snap.is_safe) return 'Les bots entrent normalement.'
  return snap.is_macro_safe === false
    ? 'Les bots n’entrent pas : entrées bloquées, filtre macro actif.'
    : 'Les bots n’entrent pas : entrées bloquées tant que ça dure.'
}

// The bitcoin trend, against its 200-day average: a distance, not a gain or a loss, so
// it stays in ink with its sign.
function trendLine(snap: MiSnapshot): string | null {
  if (!snap.trend_regime) return null
  const trend = trendFr(snap.trend_regime)
  if (snap.btc_vs_ema200_pct == null) return trend
  return `${trend}, ${fmtPct(snap.btc_vs_ema200_pct, 1)} par rapport à sa moyenne sur ${frNumber(200, 0)} jours`
}

const PANEL = 'rounded-lg border bg-card p-4 sm:px-6 sm:py-5 grid gap-4 md:grid-cols-[1.1fr_1fr] md:gap-8'
const BAR = 'rounded bg-card-2 animate-pulse motion-reduce:animate-none'

export default function MiRegimeBadge() {
  const [snap, setSnap] = useState<MiSnapshot | null | undefined>(undefined)

  useEffect(() => {
    getLatestMiSnapshot().then(setSnap)
  }, [])

  if (snap === undefined) {
    // A skeleton of the final height, never a « Chargement… » sentence in a first
    // screen (spec §3.4).
    return (
      <div data-testid="mi-regime-skeleton" aria-busy="true" className={`${PANEL} border-border`}>
        <div className="space-y-3">
          <div className={`h-7 w-32 ${BAR}`} />
          <div className={`h-4 w-64 max-w-full ${BAR}`} />
          <div className={`h-4 w-48 max-w-full ${BAR}`} />
        </div>
        <div className="space-y-3">
          <div className={`h-5 w-56 max-w-full ${BAR}`} />
          <div className={`h-4 w-72 max-w-full ${BAR}`} />
          <div className={`h-4 w-60 max-w-full ${BAR}`} />
        </div>
      </div>
    )
  }

  if (snap === null) {
    // An absent reading is not coloured, and is not dressed as a state.
    return (
      <div data-testid="meteo-panel" className={`${PANEL} border-border`}>
        <p className="text-sm text-muted">Pas encore de données. La météo reparaît au prochain relevé.</p>
      </div>
    )
  }

  const known = snap.regime != null && snap.regime in TITLE_TONE
  const title = known ? capitalise(regimeFr(snap.regime)) : 'État non relevé'
  const tone = known ? TITLE_TONE[snap.regime as string] : 'text-foreground'
  const stress = snap.regime === 'RED'
  const sides = allowedSides(snap.allow_long, snap.allow_short)
  const trend = trendLine(snap)

  return (
    <section
      data-testid="meteo-panel"
      data-regime={snap.regime ?? ''}
      aria-labelledby="meteo-etat"
      className={`${PANEL} ${stress ? 'border-negative' : 'border-border'}`}
    >
      <div>
        <h2 id="meteo-etat" className={`text-2xl font-semibold leading-tight mb-1.5 ${tone}`}>
          {title}
        </h2>
        <p className="text-sm sm:text-base">
          {snap.composite_score != null
            ? <>Score global{' '}<span className="font-semibold tabular-nums">{scoreText(snap.composite_score)}</span>{' '}{scaleText()}.</>
            : 'Score global non relevé.'}
        </p>
        <p className="mt-1 text-sm text-muted">
          {`Relevé le ${longDateTime(snap.snapshot_at)}, ${freshness(snap.snapshot_at)}.`}
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold mb-1">Ce que ça autorise pour mes bots</h3>
        <p className="text-sm sm:text-base">{todayForBots(snap)}</p>
        {(sides || trend) && (
          <dl className="mt-2 space-y-1 text-sm">
            {sides && (
              <div>
                <dt className="inline text-muted">{'Sens permis : '}</dt>
                <dd className="inline">{sides}</dd>
              </div>
            )}
            {trend && (
              <div>
                <dt className="inline text-muted">{'Tendance du bitcoin : '}</dt>
                <dd className="inline tabular-nums">{trend}</dd>
              </div>
            )}
          </dl>
        )}
      </div>
    </section>
  )
}
