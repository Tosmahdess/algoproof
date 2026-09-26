import { linkClass } from '@/lib/link-roles'
import Link from 'next/link'
import { fichesByFamily } from '@/lib/strategy-library'
import { familyLabel, familyDescription } from '@/lib/families'
import { getAllBotsWithStats } from '@/lib/queries'
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
  const [bots, searchSpace, funnel] = await Promise.all([
    getAllBotsWithStats().then(excludeArchived),
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
    <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 sm:pt-12">
      <h1 className="text-3xl font-semibold tracking-tight mb-3">Les stratégies</h1>
      <p className="text-sm sm:text-base text-muted mb-6 sm:mb-3 max-w-[60ch]">
        Comment marche chaque stratégie que je teste, et lesquelles tournent
        vraiment chez moi. Pour voir les bots en direct, va sur{' '}
        <Link href="/overview" className={linkClass('inline')}>La flotte</Link>.
      </p>
      {/* Computer only: there the search sits at 1 141 px on a 900 px screen.
          On a phone the method folds and the search is already in view. */}
      <a href="#registre"
         className={linkClass('nav', 'max-sm:hidden inline-block mb-8 text-sm')}>
        Aller aux stratégies ↓
      </a>

      {/* The engine-process explainer, once for the whole library — it used to
          repeat on all 22 concept pages, which punished exactly the visitor who
          browses several fiches. Concept pages point at #comment-je-decide. */}
      {/* Lot 5 (conception §5.3): the engine first, the same blocks as the home, so
          the first figure of the page is the engine's, not a fiche count. Since the
          counter-audit (2026-09-26) that is the balance sheet, then what the
          configurations become, strategy by strategy (no fleet line: the intro links it). */}
      <div className="mb-8">
        <EngineSummary counts={funnel} />
      </div>
      <EngineSurvival counts={funnel} />

      <GauntletExplainer space={searchSpace} />

      <StrategiesRegister groups={groups} />
    </main>
  )
}
