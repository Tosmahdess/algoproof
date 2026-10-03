// What my engine judged, as an addition (owner, 03/10/2026: « on perd l'info du
// nombre de configurations testées, de celles qui ont eu un go »). Proposal
// Impeccable, docs/home-chiffres/impeccable/PROPOSITION.md.
//
// Framing (owner, 03/10: « bizarre d'avoir à gauche "Mon moteur retient…" qui ne va
// pas jusqu'en bas des chiffres à droite »), docs/engine-cadre/claude/PROPOSITION.md:
// the heading and its text share one line, on the hero's grid, and the register runs
// full width under it, so no column waits for a taller one. The swept total is a
// register line (label, note, figure); the addition is one horizontal row from
// 1 024 px, two rows of two from 768 px, register lines below.
//
// The three verdicts always sum to the judged total (verdictTotals in funnel.ts),
// so the block takes the form the site already has for a total: the sum closed by a
// double rule (DESIGN.md, « Double trait de l'addition »). No big number: the ratio
// is said in the heading, in words, and every figure sits at the register's size.
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

const FIGURE = 'whitespace-nowrap text-xl font-medium tabular-nums md:text-[22px]'
// One register line below 768 px (label left, figure right, note under); from 768 px,
// a column of the addition (label, figure, note, stacked and left-aligned).
const ITEM = 'grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-t border-border py-3.5 md:block md:border-t-0 md:py-0'

// The operator sits in the gutter to the right of its left operand, centred on the
// figure line: + after « Recalées » and « En sursis », = after « Candidates ». At
// 768 px the second + ends the first row, so no row starts with an operator. Drawn,
// never typed: it is not read aloud and stays in the note ink (DESIGN.md, muted).
// The shift is half its width plus half the gutter (gap-x-12, 3 rem).
function Operator({ kind }: { kind: 'plus' | 'equals' }) {
  return (
    <svg data-testid="engine-op" data-op={kind} aria-hidden="true" focusable="false" viewBox="0 0 12 12"
         fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
         className="pointer-events-none absolute right-0 top-1/2 hidden h-3 w-3 -translate-y-1/2 translate-x-[calc(50%+1.5rem)] text-muted md:block">
      {kind === 'plus' ? <path d="M6 1.5v9M1.5 6h9" /> : <path d="M1.5 4h9M1.5 8h9" />}
    </svg>
  )
}

function Verdict({ label, value, note, op }: { label: string, value: number, note: string, op: 'plus' | 'equals' }) {
  return (
    <div data-testid="engine-row" className={ITEM}>
      <dt className="font-semibold">{label}</dt>
      <dd className={`relative text-right md:mt-1 md:text-left ${FIGURE}`}>
        {n(value)}
        <Operator kind={op} />
      </dd>
      <dd className="col-span-2 mt-1 text-xs text-muted">{note}</dd>
    </div>
  )
}

export default function EngineLedger({ counts }: { counts: FunnelCounts | null }) {
  if (!counts || counts.n_judged <= 0) return null
  const ratio = heroRatio(counts.n_go, counts.n_judged)
  const unjudged = counts.n_swept - counts.n_judged

  return (
    <section data-testid="home-engine" aria-labelledby="home-engine-title" className="border-b border-border py-8 sm:py-9">
      {/* The header, on the hero's grid (page.tsx): heading left, text right. */}
      <div data-testid="engine-head" className="grid grid-cols-1 gap-3 lg:grid-cols-[1.3fr_1fr] lg:items-end lg:gap-[75px]">
        <h2 id="home-engine-title" className="text-2xl font-semibold tracking-tight">
          {ratio !== null
            ? <>Mon moteur retient environ 1 configuration sur{' '}<span className="tabular-nums">{n(ratio)}</span></>
            : 'Mon moteur n’a retenu aucune configuration'}
        </h2>
        <div>
          <p className="max-w-[60ch] text-muted">
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

      {/* Floor 1, the swept total, as its own line (owner, 03/10). Named « recensées », never
          « testées » (funnel.ts) nor « recalées » (D059), and kept out of the addition below.
          It uses the addition's columns: label over « Recalées », figure over the judged total. */}
      <dl data-testid="engine-swept" className="mt-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-t border-border py-3.5 md:grid-cols-2 md:gap-x-12 md:pr-12 lg:grid-cols-4 lg:pr-0">
          <dt className="font-semibold">Configurations recensées</dt>
          <dd className={`${FIGURE} text-right font-semibold md:text-left lg:col-start-4 lg:row-start-1`}>{n(counts.n_swept)}</dd>
          <dd className="col-span-2 mt-1 text-xs text-muted lg:col-start-2 lg:row-start-1 lg:mt-0">
            Toutes celles que mon moteur a énumérées. Je n’en juge qu’une partie
            {unjudged > 0
              ? <>{' '}: les{' '}<span className="tabular-nums">{n(unjudged)}</span>{' '}autres n’ont pas de verdict : je ne les compte pas comme recalées.</>
              : '.'}
          </dd>
        </div>
      </dl>

      {/* Floor 2, the addition. The right padding at 768 px holds the + that ends the first row. */}
      <dl data-testid="engine-ledger" className="md:grid md:grid-cols-2 md:gap-x-12 md:gap-y-6 md:border-t md:border-border md:pr-12 md:pt-3.5 lg:grid-cols-4 lg:pr-0">
        <Verdict label="Recalées" value={counts.n_no_go} note="Je publie le motif de chacune." op="plus" />
        <Verdict label="En sursis" value={counts.n_marginal} note="Une seule des trois premières épreuves ratée. Elles restent publiées." op="plus" />
        <Verdict label="Candidates" value={counts.n_go} note="Les quatre épreuves tenues." op="equals" />
        {/* The total: a register line closed by the double rule below 768 px; from 768 px the
            double rule sits under its figure, as under « Base + résultat » (BotFigures). */}
        <div data-testid="engine-total" className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-b-[3px] border-t border-double border-b-border-strong border-t-border-strong py-3.5 md:block md:border-0 md:py-0">
          <dt className="font-semibold">Configurations jugées</dt>
          <dd className={`${FIGURE} text-right font-semibold md:mt-1 md:text-left`}>
            <span data-testid="engine-total-figure" className="md:inline-block md:border-b-[3px] md:border-double md:border-border-strong md:pb-1">{n(counts.n_judged)}</span>
          </dd>
        </div>
      </dl>

      {/* What these counts are not. */}
      <p data-testid="engine-outside" className="mt-4 text-xs leading-relaxed text-muted md:mt-5">
        Ces nombres comptent des configurations. Mes bots et les variantes de la bibliothèque se comptent à part.
      </p>
    </section>
  )
}
