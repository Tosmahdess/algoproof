import Link from 'next/link'
import { fichesByFamily } from '@/lib/strategy-library'
import { familyLabel, familyDescription } from '@/lib/families'
import { getAllBotsWithStats } from '@/lib/queries'
import { incarnationsOf } from '@/lib/incarnations'
import { excludeArchived } from '@/lib/cohort'
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
  const [bots, searchSpace] = await Promise.all([
    getAllBotsWithStats().then(excludeArchived),
    getSearchSpace(),
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
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight mb-3">Les stratégies</h1>
      <p className="text-sm text-muted mb-8">
        Comment marche chaque stratégie que je teste, et lesquelles tournent
        vraiment chez moi. Pour voir les bots en direct, va sur{' '}
        <Link href="/overview" className="text-accent">La flotte</Link>.
      </p>

      {/* The engine-process explainer, once for the whole library — it used to
          repeat on all 22 concept pages, which punished exactly the visitor who
          browses several fiches. Concept pages point at #comment-je-decide. */}
      <GauntletExplainer space={searchSpace} />

      <StrategiesRegister groups={groups} />
    </main>
  )
}
