// What the engine's configurations become, strategy by strategy — /strategies only
// (counter-audit 2026-09-26, proposal of Codex Astra chosen by the owner).
//
// Three chosen examples, then every strategy in a fold, alphabetically. Never a
// ranking: « Keltner 1 sur 146 » at the top of a sorted list reads as « the best
// strategy », and the search spaces differ from one strategy to the next. The
// section says it counts candidates and measures no gain.
//
// It counts configurations only. The fleet line that used to sit below the funnel
// is not repeated here: the page's introduction already links the fleet.
import Link from 'next/link'
import type { BaseSurvival, FunnelCounts } from '@/lib/funnel'
import { MIN_JUDGED_FOR_RANKING } from '@/lib/funnel'
import { frNumber } from '@/lib/display'
import { engineBaseLabel } from '@/lib/engine-base-labels'
import { FICHE_BY_ENGINE_BASE } from '@/lib/strategy-keys'
import { linkClass } from '@/lib/link-roles'
import Repli from '@/components/Repli'

const n = (v: number) => frNumber(v, 0)

// The open example of the whole site (its parameters are published): always shown.
const REFERENCE_BASE = 'EMAcross'

const TF_LABEL: Record<string, string> = {
  M1: '1 min', M5: '5 min', M15: '15 min', M30: '30 min',
  H1: '1 h', H2: '2 h', H4: '4 h', H8: '8 h', H12: '12 h', D1: '1 jour', W1: '1 semaine',
}
const horizons = (b: BaseSurvival) => b.timeframes.map(tf => TF_LABEL[tf] ?? tf).join(', ')

/** « ≈ 1 sur 146 », or « Aucune sur 20 004 » when nothing was kept. */
function oneIn(b: BaseSurvival): string {
  return b.retained > 0 ? `≈ 1 sur ${n(Math.round(b.judged / b.retained))}` : `Aucune sur ${n(b.judged)}`
}

/**
 * Three situations that differ, among strategies judged often enough to mean
 * something: the highest share kept, the site's open example, and the most-judged
 * strategy that kept none (or the lowest share when every strategy kept one).
 */
export function pickExamples(all: BaseSurvival[]): BaseSurvival[] {
  const judged = all.filter(b => b.judged >= MIN_JUDGED_FOR_RANKING)
  if (judged.length === 0) return []
  const share = (b: BaseSurvival) => b.retained / b.judged
  const highest = judged.reduce((a, b) => (share(b) > share(a) ? b : a))
  const reference = judged.find(b => b.base === REFERENCE_BASE)
  const zeros = judged.filter(b => b.retained === 0)
  const lowest = zeros.length > 0
    ? zeros.reduce((a, b) => (b.judged > a.judged ? b : a))
    : judged.reduce((a, b) => (share(b) < share(a) ? b : a))
  const picked: BaseSurvival[] = []
  for (const b of [highest, reference, lowest]) {
    if (b && !picked.includes(b)) picked.push(b)
  }
  return picked
}

function Name({ base }: { base: string }) {
  const label = engineBaseLabel(base)
  const fiche = Object.hasOwn(FICHE_BY_ENGINE_BASE, base) ? FICHE_BY_ENGINE_BASE[base] : null
  return fiche
    ? <Link data-name href={`/strategies/${fiche}`} className={linkClass('record', 'text-sm')}>{label}</Link>
    : <span data-name className="text-sm">{label}</span>
}

export default function EngineSurvival({ counts }: { counts: FunnelCounts | null }) {
  const all = counts?.by_base ?? []
  const examples = pickExamples(all)
  if (examples.length === 0) return null
  const alphabetical = [...all].sort((a, b) => engineBaseLabel(a.base).localeCompare(engineBaseLabel(b.base), 'fr'))

  return (
    <section data-testid="survival-section" aria-labelledby="survival-title" className="mb-12">
      <h2 id="survival-title" className="text-xl font-semibold mb-1">Ce que mes configurations deviennent, stratégie par stratégie</h2>
      <p className="text-xs text-muted mb-3 max-w-[68ch]">
        Trois exemples choisis, pas un classement. Je compte les configurations candidates : ce tableau ne mesure pas
        leurs gains, et chaque stratégie a son propre nombre de réglages essayés.
      </p>
      <div className="bg-card border border-border rounded-lg p-4 sm:p-5">
        <ul data-testid="survival-examples" className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {examples.map(b => (
            <li key={b.base} data-testid="survival-row" className="min-w-0 rounded-md bg-card-2 p-3">
              <Name base={b.base} />
              <p className="font-mono text-lg tabular-nums mt-1">{oneIn(b)}</p>
              <p className="text-xs text-muted mt-0.5">
                {n(b.retained)}{' '}candidate{b.retained > 1 ? 's' : ''} sur {n(b.judged)}{' '}jugées
              </p>
            </li>
          ))}
        </ul>
        <Repli
          id="survival-full"
          titre={`Voir les ${all.length} stratégies du moteur`}
          toujoursPliable
          className="mt-4 border-t border-border pt-2"
          titreClassName="text-sm font-semibold"
        >
          <ul data-testid="survival-full" className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
            {alphabetical.map(b => (
              <li key={b.base} data-testid="survival-full-row" className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 py-2 border-b border-border/50">
                <Name base={b.base} />
                <span className="font-mono text-xs tabular-nums whitespace-nowrap">{oneIn(b)}</span>
                <span className="col-span-2 text-xs text-muted">
                  {n(b.retained)}{' '}sur {n(b.judged)}{' '}jugées · {horizons(b)}
                </span>
              </li>
            ))}
          </ul>
        </Repli>
      </div>
    </section>
  )
}
