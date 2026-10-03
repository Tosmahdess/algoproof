// What my engine passes, as a funnel (owner, 03/10/2026: « on perd l'info du nombre de
// configurations testées, de celles qui ont eu un go », then « ça ne vaut pas mieux en
// entonnoir ? du plus grand chiffre au plus petit »).
//
// Three nested sets, so a funnel is true here: the candidates are part of the judged,
// which are part of the swept (getFunnelCounts, one generation per rung). Configurations
// only, never a bot (D059): the fleet is counted elsewhere. The rejected and the
// suspended are not a step: they are the judged that did not get through, written at the
// judged step, and the three verdicts still sum to it (verdictTotals in funnel.ts).
//
// No proportional bars (the owner removed the old funnel's bars, and 4 347 against 51
// million would draw nothing). The funnel is typographic: the figures shrink, and from
// 768 px each step's rule is shorter than the one above. The swept corpus is never
// called « testé » (funnel.ts) nor « recalé » (D059), and the unjudged rest is not
// counted: it grows with every sweep (owner, 03/10).
//
// The conclusion comes under the figures (owner, 03/10): the ratio, said in words.
import Link from 'next/link'
import type { FunnelCounts } from '@/lib/funnel'
import { frNumber } from '@/lib/display'
import { heroRatio } from '@/lib/hero-ratio'
import { labUrl } from '@/lib/lab-links'
import { linkClass } from '@/lib/link-roles'

const n = (v: number) => frNumber(v, 0)

const STEP = 'grid grid-cols-1 gap-x-8 gap-y-1 border-t border-border py-4 md:grid-cols-[11ch_minmax(0,1fr)] md:items-baseline'
const FIGURE = 'whitespace-nowrap text-2xl font-medium tabular-nums md:text-right md:text-[28px]'

// Between two steps: a downward chevron under the figures, drawn, never typed, so it is not
// read aloud (DESIGN.md: icons are drawn, in the note ink).
function Down() {
  return (
    <li aria-hidden="true" className="md:grid md:grid-cols-[11ch_minmax(0,1fr)] md:gap-x-8">
      <svg data-testid="engine-down" aria-hidden="true" focusable="false" viewBox="0 0 12 12" fill="none"
           stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
           className="my-1 h-3 w-3 text-muted md:justify-self-end md:mr-[3ch]">
        <path d="M2 4.5 6 8.5l4-4" />
      </svg>
    </li>
  )
}

export default function EngineLedger({ counts }: { counts: FunnelCounts | null }) {
  if (!counts || counts.n_judged <= 0) return null
  const ratio = heroRatio(counts.n_go, counts.n_judged)

  return (
    <section data-testid="home-engine" aria-labelledby="home-engine-title" className="border-b border-border py-8 sm:py-9">
      <ol data-testid="engine-funnel" aria-label="De ce que mon moteur passe en revue à ce qu’il retient" className="list-none p-0">
        <li data-testid="engine-step" data-step="swept" className={STEP}>
          <span className={FIGURE}>{n(counts.n_swept)}</span>
          <div>
            <p className="font-semibold">configurations recensées</p>
            <p className="mt-1 text-sm text-muted">Toutes les combinaisons de réglages que mon moteur a passées en revue. Seule une partie va jusqu’aux quatre épreuves.</p>
          </div>
        </li>
        <Down />
        <li data-testid="engine-step" data-step="judged" className={`${STEP} md:w-[88%]`}>
          <span className={FIGURE}>{n(counts.n_judged)}</span>
          <div>
            <p className="font-semibold">jugées par mes quatre épreuves</p>
            <p data-testid="engine-dropped" className="mt-1 text-sm text-muted">
              Dont{' '}<span className="tabular-nums text-foreground">{n(counts.n_no_go)}</span>{' '}recalées, chacune avec son motif publié, et{' '}
              <span className="tabular-nums text-foreground">{n(counts.n_marginal)}</span>{' '}en sursis, qui ont raté une seule des trois premières épreuves.
            </p>
          </div>
        </li>
        <Down />
        <li data-testid="engine-step" data-step="go" className={`${STEP} border-b md:w-[76%]`}>
          <span className={FIGURE}>{n(counts.n_go)}</span>
          <div>
            <p className="font-semibold">candidates</p>
            <p className="mt-1 text-sm text-muted">Les quatre épreuves tenues.</p>
          </div>
        </li>
      </ol>

      {/* What these counts are not. */}
      <p data-testid="engine-outside" className="mt-4 text-xs leading-relaxed text-muted">
        Ces nombres comptent des configurations. Mes bots et les variantes de la bibliothèque se comptent à part.
      </p>

      {/* The conclusion under the figures (owner, 03/10), stacked full width. */}
      <div data-testid="engine-head" className="mt-8 grid grid-cols-1 gap-3 border-t border-border pt-6">
        <h2 id="home-engine-title" className="text-2xl font-semibold tracking-tight">
          {ratio !== null
            ? <>Mon moteur retient environ 1 configuration sur{' '}<span className="tabular-nums">{n(ratio)}</span></>
            : 'Mon moteur n’a retenu aucune configuration'}
        </h2>
        <div>
          <p className="max-w-[72ch] text-muted">
            Une configuration, c’est une stratégie avec des réglages précis. Celles que je juge passent
            quatre épreuves. Une candidate n’est pas une gagnante : elle a gagné le droit d’être surveillée
            en simulation, sans argent.
          </p>
          <div className="mt-1 flex flex-wrap gap-x-6">
            <a href={labUrl('https://lab.algoproof.fr/cockpit/cimetiere', 'home-cimetiere')} target="_blank" rel="noopener noreferrer"
               className={linkClass('inline', 'inline-flex min-h-11 items-center')}>
              Voir le cimetière ↗
            </a>
            <Link href="/strategies#comment-je-decide" className={linkClass('inline', 'inline-flex min-h-11 items-center')}>
              Comment je décide →
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
