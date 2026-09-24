// The Fonctionnel tab of an engine-born bot (2026-09-24, option A of the
// brainstorm): the concept summary inline, so the reader does not have to
// leave the fiche, then what belongs to THIS bot. Only the first `logic`
// paragraph: later ones can speak of one specific legacy bot (Keltner's names
// the XAU bot). Never `fiche.params`: those are the Lab's parameter names, not
// the engine's, and a head's settings are the members-only Technique tab.
import Link from 'next/link'
import { linkClass } from '@/lib/link-roles'
import type { StrategyFiche } from '@/lib/strategy-library'

const ticker = (a: string) => a.split('/')[0]

export default function EngineBotSummary({ fiche, conceptSlug, slug, timeframe, exchange, assets }: {
  fiche: StrategyFiche
  conceptSlug: string
  slug: string
  timeframe: string
  exchange: string
  assets: string[]
}) {
  const head = /head(\d+)$/.exec(slug)?.[1]
  const rows = [
    { label: 'Quand il entre', text: `${fiche.oneLiner} ${fiche.logic[0] ?? ''}`.trim() },
    { label: 'Où ça marche', text: fiche.worksWhen[0] },
    { label: 'Où ça meurt', text: fiche.diesWhen[0] },
  ].filter(r => r.text)

  return (
    <div data-testid="engine-bot-summary" className="space-y-4">
      <dl className="space-y-2.5">
        {rows.map(r => (
          <div key={r.label} className="flex flex-col sm:flex-row sm:gap-3">
            <dt className="text-xs font-semibold uppercase tracking-widest text-muted sm:w-36 shrink-0 sm:pt-0.5">{r.label}</dt>
            <dd className="text-sm leading-relaxed">{r.text}</dd>
          </div>
        ))}
      </dl>
      <p data-testid="engine-bot-own" className="text-sm leading-relaxed">
        {head
          ? <>C&apos;est la grappe n° {head} que mon moteur a retenue pour {fiche.title} en {timeframe}. </>
          : <>Il tourne en {timeframe}. </>}
        Il trade {assets.length} marchés {exchange} : {assets.map(ticker).join(', ')}.
        {' '}Ce qui le distingue des autres grappes de la même stratégie (les réglages, les filtres
        retenus par le gantelet, le stop et la cible) est dans l&apos;onglet Technique, que je réserve
        aux membres du labo.
      </p>
      <Link href={`/strategies/${conceptSlug}`} className={linkClass('inline', 'text-sm')}>
        Ce que dit la fiche complète de la stratégie →
      </Link>
    </div>
  )
}
