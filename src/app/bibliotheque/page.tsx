import Link from 'next/link'
import LibraryIndex, { type IdeaCardData } from '@/components/library/LibraryIndex'
import { getLibraryIdeas, ideaSlug } from '@/lib/library'
import { engineBaseLabel } from '@/lib/engine-base-labels'
import { familyLabel, type Family } from '@/lib/families'
import { linkClass } from '@/lib/link-roles'

// The library (chantier bibliotheque, lot 2, D079/D083). Every survivor of the
// engine, launched or not, one card per idea. Read through the library_ideas view
// (migration 061): the fleet pages keep excluding never-launched survivors.
export const revalidate = 1800

export const metadata = {
  title: 'La bibliothèque des stratégies qui ont survécu',
  description:
    'Toutes les variantes de stratégies qui ont passé mes épreuves de backtest, rangées par idée : celles qui tournent en simulation et celles qui attendent leur tour.',
  openGraph: { url: 'https://algoproof.fr/bibliotheque' },
}

export default async function BibliothequePage() {
  const ideas = await getLibraryIdeas()
  const cards: IdeaCardData[] = ideas.map(i => ({
    ...i,
    slug: ideaSlug(i.idea_key),
    label: engineBaseLabel(i.base),
    familyLabel: familyLabel(i.family as Family),
  }))
  const variants = cards.reduce((n, i) => n + i.n_variants, 0)
  const live = cards.reduce((n, i) => n + i.n_live, 0)
  const paper = cards.reduce((n, i) => n + i.n_paper, 0)
  const waiting = cards.reduce((n, i) => n + i.n_backtest, 0)
  const fr = (n: number) => n.toLocaleString('fr-FR')

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 sm:pt-12 pb-16">
      <h1 className="text-3xl font-semibold tracking-tight mb-3">La bibliothèque</h1>
      <p className="text-sm sm:text-base text-muted mb-3 max-w-[62ch]">
        Chaque variante trouvée par mon moteur qui a passé mes épreuves de backtest est ici,
        lancée ou pas encore.
        Une carte par idée, c&apos;est-à-dire une stratégie sur une unité de temps, avec
        toutes ses variantes derrière.
      </p>
      <p className="text-sm sm:text-base text-muted mb-6 max-w-[62ch]">
        {`Aujourd'hui : ${fr(variants)} variantes. `}
        {live > 0 && `${fr(live)} tournent avec mon argent, `}
        {`${fr(paper)} en simulation, et ${fr(waiting)} en backtest seul, qui attendent que je les lance : la page de chaque idée dit pourquoi. `}
        Les bots que j&apos;ai écrits à la main n&apos;y sont pas encore. Tous les bots qui tournent
        se suivent sur{' '}
        <Link href="/overview" className={linkClass('inline')}>La flotte</Link>.
      </p>
      <LibraryIndex ideas={cards} />
    </main>
  )
}
