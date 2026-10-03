import { linkClass } from '@/lib/link-roles'
import Link from 'next/link'
import { fichesByFamily } from '@/lib/strategy-library'
import { familyLabel, familyDescription } from '@/lib/families'
import { getBots } from '@/lib/queries'
import { incarnationsOf } from '@/lib/incarnations'
import { excludeArchived } from '@/lib/cohort'
import { getFunnelCounts } from '@/lib/funnel'
import EngineSummary from '@/components/home/EngineSummary'
import EngineSurvival from '@/components/home/EngineSurvival'
import GauntletExplainer from '@/components/GauntletExplainer'
import { getSearchSpace } from '@/lib/engine-search-space'
import StrategiesRegister, { type FicheGroup } from '@/components/StrategiesRegister'

export const revalidate = 300

export const metadata = {
  title: 'Les stratégies de trading, expliquées et testées',
  description:
    'Chaque stratégie que je teste, expliquée en français simple : comment elle marche, quand elle marche, quand elle meurt, et quels bots la font tourner chez moi.',
  openGraph: { url: 'https://algoproof.fr/strategies' },
}

export default async function StrategiesIndexPage() {
  // FIX (final whole-branch review, I4): same rule as the concept page — the
  // count next to each fiche reads « 2 bots » and the page it leads to heads
  // that list « Ce qui tourne chez moi ». A retired bot inflated both.
  // Read alongside the bots: the explainer's figures are the engine's own counts now,
  // not literals. Null (unbackfilled unit or a failed read) renders the sentences without
  // the numbers rather than with a constant that has stopped matching the engine.
  // The bot ROWS only (lot 1b, D094): the page counts incarnations and reads no figure,
  // so it has no use for anyone's trades or daily series.
  const [bots, searchSpace, funnel] = await Promise.all([
    getBots().then(excludeArchived),
    getSearchSpace(),
    getFunnelCounts(),
  ])

  // Serializable projection for the client register: the fiche objects carry
  // readonly tuples and functions live in the libs, so only what the rows
  // render crosses the boundary.
  const groups: FicheGroup[] = fichesByFamily().map(({ family, fiches }) => ({
    family,
    label: familyLabel(family),
    description: familyDescription(family),
    fiches: fiches.map(f => ({
      slug: f.slug,
      title: f.title,
      oneLiner: f.oneLiner,
      botCount: incarnationsOf(f, bots).length,
    })),
  }))

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 sm:pt-12">
      <h1 className="text-3xl font-semibold tracking-tight mb-3">Les stratégies</h1>
      <p className="text-sm sm:text-base text-muted mb-6 max-w-[60ch]">
        Comment marche chaque stratégie que je teste, et lesquelles tournent
        vraiment chez moi. Pour voir les bots en direct, va sur{' '}
        <Link href="/overview" className={linkClass('inline')}>La flotte</Link>.
        Toutes les variantes qui ont passé mes épreuves, lancées ou pas encore, sont dans{' '}
        <Link href="/bibliotheque" className={linkClass('inline')}>la bibliothèque</Link>.
      </p>
      {/* Lot 5 (conception §5.3): the engine first, the same block as the home, so
          the first figure of the page is the engine's, not a fiche count. */}
      <div className="mb-8">
        <EngineSummary counts={funnel} />
      </div>

      {/* Counter-audit 2026-09-26 (item 16): the search and the families come before the
          long method, which pushed the search to 2 038 px on a computer and 1 292 px on a
          phone. What the configurations become, then the method, follow the register. */}
      <StrategiesRegister groups={groups} />

      <EngineSurvival counts={funnel} />

      {/* The engine-process explainer, once for the whole library; concept pages and
          the home point at its anchor #comment-je-decide, which still resolves here. */}
      <GauntletExplainer space={searchSpace} />
    </div>
  )
}
