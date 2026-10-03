import type { BotStats } from '@/lib/types'
import { evaluatePathToReal, DEFAULT_LIVE_GATE, type LiveGate, type PathCriterion } from '@/lib/path-to-real'
import { fmtPfDisplay, frNumber, NARROW_NBSP } from '@/lib/display'

interface Props {
  status: string
  stats: BotStats
  liveGate?: Partial<LiveGate>
}

/** The value a reader sees beside the threshold. No trade yet: « — ». */
function fmt(c: PathCriterion): string {
  if (!c.measurable) return '—'
  if (c.format === 'pct') return `${frNumber(c.value * 100, 1)}${NARROW_NBSP}%`
  if (c.format === 'count') return `${c.value} sur ${c.target}`
  return fmtPfDisplay(null, 1, c.value)
}

// The paper→real gate, public, for paper bots only.
//
// A live bot used to get a 55 px card here, « En argent réel depuis le … »:
// the provenance line at the top of the same fiche already says it, from the
// same column (bots.live_since), 3 000 px earlier on a phone. Removed
// 2026-09-19 (D057); the date has one surface, provenanceSentence().
//
// Refonte « Le registre des décisions », lot 3 (2026-10-02): the gate reads like the
// rules beside it, a value against its threshold, no gauge and no green tick. Without a
// trade the ratios are « — », « pas encore mesurable » (audit 2026-10, constat 6).
export default function PathToRealCard({ status, stats, liveGate }: Props) {
  if (status !== 'paper') return null

  const gate = { ...DEFAULT_LIVE_GATE, ...liveGate }
  const { criteria, met } = evaluatePathToReal(stats, gate)

  return (
    <div data-testid="path-to-real">
      <h3 className="text-lg font-semibold">Avant le moindre euro réel</h3>
      <p className="text-sm text-muted mt-1">
        {`Avant le passage en argent réel, je demande à chaque bot de remplir ces ${criteria.length} critères publics et obligatoires.`}
      </p>
      <dl className="mt-3 border-t border-border">
        {criteria.map(c => (
          <div key={c.label} data-testid="ptr-row" className="flex items-baseline justify-between gap-4 border-b border-border py-3">
            <dt className="text-sm">
              {c.label}
              <span className="block text-xs text-muted">
                {!c.measurable ? 'pas encore mesurable' : c.met ? 'atteint' : 'pas encore atteint'}
              </span>
            </dt>
            <dd className="text-xl tabular-nums">{fmt(c)}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted mt-3">
        {`${met} critère${met > 1 ? 's' : ''} sur ${criteria.length} atteint${met > 1 ? 's' : ''} : rien ne passe en réel avant les ${criteria.length}.`}
      </p>
    </div>
  )
}
