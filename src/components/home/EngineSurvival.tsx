// Which strategies survive the gauntlet, one line each (counter-audit 2026-09-26).
//
// It replaces the funnel's bars: the totals moved to the hero (EngineSummary), and
// what the totals alone never said is which strategies pass. Keltner keeps 1 in
// 146 of its judged configurations, EMA cross 1 in 2 544, Order block none in
// 20 000: that difference is the information. Share retained is not
// profitability, and the section says so.
//
// The fleet line stays here, below and outside the engine's figures (D059): it
// counts bots, some of them deployed by hand before the engine existed.
import Link from 'next/link'
import type { BaseSurvival, FunnelCounts } from '@/lib/funnel'
import { MIN_JUDGED_FOR_RANKING } from '@/lib/funnel'
import { frNumber } from '@/lib/display'
import { engineBaseLabel } from '@/lib/engine-base-labels'
import { FICHE_BY_ENGINE_BASE } from '@/lib/strategy-keys'
import { linkClass } from '@/lib/link-roles'
import { labUrl } from '@/lib/lab-links'
import Repli from '@/components/Repli'

const n = (v: number) => frNumber(v, 0)
const RANKED_ROWS = 5

/** « 1 sur 146 », or « aucune sur 20 000 » when nothing was kept. */
function oneIn(b: BaseSurvival): string {
  return b.retained > 0 ? `1 sur ${n(Math.round(b.judged / b.retained))}` : `aucune sur ${n(b.judged)}`
}

function Name({ base }: { base: string }) {
  const label = engineBaseLabel(base)
  const fiche = Object.hasOwn(FICHE_BY_ENGINE_BASE, base) ? FICHE_BY_ENGINE_BASE[base] : null
  return fiche
    ? <Link href={`/strategies/${fiche}`} className={linkClass('record', 'text-sm')}>{label}</Link>
    : <span className="text-sm">{label}</span>
}

function RankedList({ title, rows, testId }: { title: string; rows: BaseSurvival[]; testId: string }) {
  return (
    <div data-testid={testId} className="min-w-0">
      <h3 className="text-xs font-semibold text-muted mb-2">{title}</h3>
      <ul className="divide-y divide-border">
        {rows.map(b => (
          <li key={b.base} data-testid="survival-row" className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 py-2">
            <Name base={b.base} />
            <span className="font-mono text-sm tabular-nums whitespace-nowrap">{oneIn(b)}</span>
            <span className="col-span-2 text-xs text-muted">
              {n(b.retained)}{' '}candidate{b.retained > 1 ? 's' : ''} sur {n(b.judged)}{' '}jugées
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function EngineSurvival({ counts, live, paper }: { counts: FunnelCounts | null; live: number; paper: number }) {
  if (!counts || counts.n_swept <= 0) return null
  const all = counts.by_base ?? []
  const ranked = all.filter(b => b.judged >= MIN_JUDGED_FOR_RANKING)
  const hasRanking = ranked.length >= RANKED_ROWS * 2

  return (
    <section aria-labelledby="home-survival-title" className="mb-12">
      {hasRanking && (
        <>
          <div className="flex items-baseline justify-between gap-4 flex-wrap mb-3">
            <h2 id="home-survival-title" className="text-xl font-semibold">Qui passe mes contrôles, stratégie par stratégie</h2>
            <span className="text-xs text-muted">configurations jugées retenues comme candidates</span>
          </div>
          <div className="bg-card border border-border border-b-0 rounded-t-lg p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <RankedList title="Celles qui passent le plus" rows={ranked.slice(0, RANKED_ROWS)} testId="survival-most" />
              <RankedList title="Celles qui ne passent presque jamais" rows={ranked.slice(-RANKED_ROWS)} testId="survival-least" />
            </div>
            <p className="text-xs text-muted mt-4 max-w-[68ch]">
              Passer ne veut pas dire gagner : une candidate a seulement gagné le droit d’être surveillée en
              simulation. Classement parmi les stratégies jugées au moins {n(MIN_JUDGED_FOR_RANKING)}{' '}fois.
            </p>
            <Repli
              id="survival-full"
              titre={`Les ${all.length} stratégies jugées`}
              toujoursPliable
              className="mt-4 border-t border-border pt-3"
              titreClassName="text-sm font-semibold"
            >
              <ul data-testid="survival-full" className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                {all.map(b => (
                  <li key={b.base} data-testid="survival-full-row" className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 py-1.5 border-b border-border/50">
                    <Name base={b.base} />
                    <span className="font-mono text-xs text-muted tabular-nums whitespace-nowrap">{oneIn(b)}</span>
                  </li>
                ))}
              </ul>
            </Repli>
          </div>
        </>
      )}
      <div className={`bg-card border border-border px-4 sm:px-5 py-4 ${hasRanking ? 'rounded-b-lg' : 'rounded-lg'}`}>
        <p data-testid="home-fleet-line" className="text-xs text-muted leading-relaxed">
          À part, la flotte : <strong className="text-foreground font-mono">{live + paper}</strong>{' '}bots en service, dont ceux déployés à la main avant le moteur, et <strong className="text-foreground font-mono">{live}</strong>{' '}avec mon argent. Les plateformes qui vendent des stratégies publient leurs gagnantes, jamais le nombre de tentatives.{' '}
          <a href={labUrl('https://lab.algoproof.fr/cockpit/cimetiere', 'funnel')} target="_blank" rel="noopener noreferrer" className={linkClass('inline')}>Voir le cimetière</a>
          {' · '}
          <Link href="/strategies#comment-je-decide" className={linkClass('inline')}>Comment je décide</Link>
        </p>
      </div>
    </section>
  )
}
