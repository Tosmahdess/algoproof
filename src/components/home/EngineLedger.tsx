// What my engine judged, as an addition (owner, 03/10/2026: « on perd l'info du
// nombre de configurations testées, de celles qui ont eu un go »). Proposal
// Impeccable, docs/home-chiffres/impeccable/PROPOSITION.md.
//
// The three verdicts always sum to the judged total (verdictTotals in funnel.ts),
// so the block takes the form the site already has for a total: rows, then the
// sum closed by a double rule (DESIGN.md, « Double trait de l'addition »). No big
// number: the ratio is said in the heading, in words, and every figure sits at
// the register's size.
//
// Same rules as EngineSummary before it: configurations only, never a bot (D059);
// the swept corpus stays OUTSIDE the sum and is never called « recalé », since most
// of it was never judged; the library's variants and the fleet's bots are counted
// elsewhere and the note says they do not nest in this addition.
import Link from 'next/link'
import type { FunnelCounts } from '@/lib/funnel'
import { frNumber } from '@/lib/display'
import { heroRatio } from '@/lib/hero-ratio'
import { labUrl } from '@/lib/lab-links'
import { linkClass } from '@/lib/link-roles'

const n = (v: number) => frNumber(v, 0)

const ROW = 'grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-t border-border py-3.5'
const FIGURE = 'whitespace-nowrap text-right text-xl font-medium tabular-nums md:text-[22px]'

export default function EngineLedger({ counts }: { counts: FunnelCounts | null }) {
  if (!counts || counts.n_judged <= 0) return null
  const ratio = heroRatio(counts.n_go, counts.n_judged)
  const unjudged = counts.n_swept - counts.n_judged

  return (
    <section
      data-testid="home-engine"
      aria-labelledby="home-engine-title"
      className="grid grid-cols-1 gap-6 border-b border-border py-8 sm:py-9 md:grid-cols-2 md:gap-[70px]"
    >
      <div>
        <h2 id="home-engine-title" className="text-2xl font-semibold tracking-tight">
          {ratio !== null
            ? <>Mon moteur retient environ 1 configuration sur{' '}<span className="tabular-nums">{n(ratio)}</span></>
            : 'Mon moteur n’a retenu aucune configuration'}
        </h2>
        <p className="mt-3 max-w-[60ch] text-muted">
          Une configuration, c’est une stratégie avec des réglages précis. Celles que je juge passent
          quatre épreuves. Une candidate n’est pas une gagnante : elle a gagné le droit d’être surveillée
          en simulation, sans argent.
        </p>
        <div className="mt-2 flex flex-wrap gap-x-6">
          <a href={labUrl('https://lab.algoproof.fr/cockpit/cimetiere', 'home-cimetiere')} target="_blank" rel="noopener noreferrer"
             className={linkClass('inline', 'inline-flex min-h-11 items-center')}>
            Voir le cimetière ↗
          </a>
          <Link href="/strategies#comment-je-decide" className={linkClass('inline', 'inline-flex min-h-11 items-center')}>
            Comment je décide →
          </Link>
        </div>
      </div>

      <div>
        {/* The total first, as its own line (owner, 03/10). Named « recensées », never
            « testées » (funnel.ts) nor « recalées » (D059), and kept out of the addition below. */}
        <dl data-testid="engine-swept" className="mb-4">
          <div className={`${ROW} md:border-t-0 md:pt-0`}>
            <dt className="font-semibold">Configurations recensées</dt>
            <dd className={`${FIGURE} font-semibold`}>{n(counts.n_swept)}</dd>
            <dd className="col-span-2 mt-1 text-xs text-muted">
              Toutes celles que mon moteur a énumérées. Je n’en juge qu’une partie
              {unjudged > 0
                ? <>{' '}: les{' '}<span className="tabular-nums">{n(unjudged)}</span>{' '}autres n’ont pas de verdict : je ne les compte pas comme recalées.</>
                : '.'}
            </dd>
          </div>
        </dl>
        <dl data-testid="engine-ledger">
          <div data-testid="engine-row" className={ROW}>
            <dt className="font-semibold">Recalées</dt>
            <dd className={FIGURE}>{n(counts.n_no_go)}</dd>
            <dd className="col-span-2 mt-1 text-xs text-muted">Je publie le motif de chacune.</dd>
          </div>
          <div data-testid="engine-row" className={ROW}>
            <dt className="font-semibold">En sursis</dt>
            <dd className={FIGURE}>{n(counts.n_marginal)}</dd>
            <dd className="col-span-2 mt-1 text-xs text-muted">Une seule des trois premières épreuves ratée. Elles restent publiées.</dd>
          </div>
          <div data-testid="engine-row" className={ROW}>
            <dt className="font-semibold">Candidates</dt>
            <dd className={FIGURE}>{n(counts.n_go)}</dd>
            <dd className="col-span-2 mt-1 text-xs text-muted">Les quatre épreuves tenues.</dd>
          </div>
          <div data-testid="engine-total" className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-b-[3px] border-t border-double border-b-border-strong border-t-border-strong py-3.5">
            <dt className="font-semibold">Configurations jugées</dt>
            <dd className={`${FIGURE} font-semibold`}>{n(counts.n_judged)}</dd>
          </div>
        </dl>
        {/* What these counts are not. */}
        <p data-testid="engine-outside" className="mt-3 text-xs leading-relaxed text-muted">
          Ces nombres comptent des configurations. Mes bots et les variantes de la bibliothèque se comptent à part.
        </p>
      </div>
    </section>
  )
}
