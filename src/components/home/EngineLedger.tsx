// What my engine passes, in five figures on one row (owner, 03/10/2026: « on perd l'info
// du nombre de configurations testées, de celles qui ont eu un go », then « les 5 chiffres
// sur la même ligne et une toute petite phrase pour chacun »). In this order they also run
// from the largest to the smallest: swept, judged, then the three verdicts of the judged.
//
// Configurations only, never a bot (D059): the fleet is counted elsewhere. The three
// verdicts sum to the judged (verdictTotals in funnel.ts). The swept corpus is never called
// « testé » (funnel.ts) nor « recalé » (D059), and the unjudged rest is not counted: it
// grows with every sweep (owner, 03/10).
//
// Layout: one row of five from 1 024 px, three then two from 640 px, register lines below
// (label and phrase left, figure right). No display-size number: 26 px at most.
// The conclusion comes under the figures (owner, 03/10): the ratio, said in words.
import Link from 'next/link'
import type { FunnelCounts } from '@/lib/funnel'
import { frNumber } from '@/lib/display'
import { heroRatio } from '@/lib/hero-ratio'
import { labUrl } from '@/lib/lab-links'
import { linkClass } from '@/lib/link-roles'

const n = (v: number) => frNumber(v, 0)

type Kind = 'swept' | 'judged' | 'no_go' | 'marginal' | 'go'

function Figure({ kind, value, label, phrase }: { kind: Kind, value: number, label: string, phrase: string }) {
  return (
    <div data-testid="engine-figure" data-kind={kind}
         className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-t border-border py-3.5 sm:flex sm:flex-col sm:border-t-0 sm:py-0">
      <dt className="font-semibold sm:order-2 sm:mt-1">{label}</dt>
      <dd className="whitespace-nowrap text-right text-xl font-medium tabular-nums sm:text-left lg:text-2xl">{n(value)}</dd>
      <dd data-testid="engine-phrase" className="col-span-2 text-sm text-muted sm:order-3 sm:mt-0.5">{phrase}</dd>
    </div>
  )
}

export default function EngineLedger({ counts }: { counts: FunnelCounts | null }) {
  if (!counts || counts.n_judged <= 0) return null
  const ratio = heroRatio(counts.n_go, counts.n_judged)

  return (
    <section data-testid="home-engine" aria-labelledby="home-engine-title" className="border-b border-border py-8 sm:py-9">
      <dl data-testid="engine-row-figures"
          className="sm:grid sm:grid-cols-3 sm:gap-x-8 sm:gap-y-6 sm:border-y sm:border-border sm:py-5 lg:grid-cols-5 lg:gap-x-6">
        <Figure kind="swept" value={counts.n_swept} label="recensées" phrase="Énumérées par mon moteur." />
        <Figure kind="judged" value={counts.n_judged} label="jugées" phrase="Passées aux quatre épreuves." />
        <Figure kind="no_go" value={counts.n_no_go} label="recalées" phrase="Avec leur motif publié." />
        <Figure kind="marginal" value={counts.n_marginal} label="en sursis" phrase="Une seule épreuve ratée." />
        <Figure kind="go" value={counts.n_go} label="candidates" phrase="Les quatre épreuves tenues." />
      </dl>

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
