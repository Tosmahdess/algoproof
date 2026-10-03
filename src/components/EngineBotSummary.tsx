// The Fonctionnel tab of an engine-born bot (2026-09-24, option A of the
// brainstorm): the concept summary inline, so the reader does not have to
// leave the fiche, then what belongs to THIS bot. Only the first `logic`
// paragraph: later ones can speak of one specific legacy bot (Keltner's names
// the XAU bot). Never `fiche.params`: those are the Lab's parameter names, not
// the engine's, and a head's settings are the members-only Technique tab.
import Link from 'next/link'
import { linkClass } from '@/lib/link-roles'
import type { StrategyFiche } from '@/lib/strategy-library'

export default function EngineBotSummary({ fiche, conceptSlug, slug, timeframe, exchange, assetCount, technicalIsPublic }: {
  fiche: StrategyFiche
  conceptSlug: string
  slug: string
  timeframe: string
  exchange: string
  assetCount: number
  /** The free sample (hand-written params in bot-params.ts) shows its recipe to everyone. */
  technicalIsPublic: boolean
}) {
  const head = /head(\d+)$/.exec(slug)?.[1]
  // The oneLiner leads; logic[0] explains. Not joined into one cell: several
  // fiches restate the oneLiner in logic[0], and side by side it read twice.
  const rows = [
    { label: 'Comment ça marche', text: fiche.logic[0] },
    { label: 'Conditions favorables', text: fiche.worksWhen[0] },
    { label: 'Limites', text: fiche.diesWhen[0] },
  ].filter(r => r.text)

  return (
    <div data-testid="engine-bot-summary" className="space-y-4">
      <p className="text-sm font-medium leading-relaxed">{fiche.oneLiner}</p>
      <dl className="space-y-2.5">
        {rows.map(r => (
          <div key={r.label} className="flex flex-col sm:flex-row sm:gap-3">
            <dt className="text-xs font-semibold text-muted sm:w-36 shrink-0 sm:pt-0.5">{r.label}</dt>
            <dd className="text-sm leading-relaxed">{r.text}</dd>
          </div>
        ))}
      </dl>
      <p data-testid="engine-bot-own" className="text-sm leading-relaxed">
        {/* No engine jargon (user rule 24/09): « grappe », « moteur » and
            « gantelet » read as noise to a visitor. The head number already
            sits in the h1, only when several heads share strategy and TF. */}
        {head
          ? <>C&apos;est une configuration que j&apos;ai retenue pour cette stratégie en {timeframe}, </>
          : <>Il tourne en {timeframe}, </>}
        sur {assetCount} marchés {exchange}.
        {' '}{head ? 'Ce qui la distingue' : 'Ce qui le distingue'} des autres configurations de la même stratégie se voit dans les réglages, les filtres
        que j&apos;ai gardés après le tri, le stop et la cible. Ces détails sont dans l&apos;onglet Technique
        {technicalIsPublic ? '.' : <>, que je réserve aux membres du labo.</>}
      </p>
      {/* 44 px tall on a phone (refonte finition, 2026-10-02). */}
      <Link href={`/strategies/${conceptSlug}`} className={linkClass('inline', 'inline-flex min-h-11 items-center text-sm')}>
        Lire la fiche complète de la stratégie&nbsp;→
      </Link>
    </div>
  )
}
