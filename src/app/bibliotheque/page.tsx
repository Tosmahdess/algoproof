// /bibliotheque, « Stratégies » in the nav (D085). Every survivor of the engine,
// launched or not, one row per idea (chantier bibliothèque, lot 2, D079/D083), read
// through the library_ideas view (migration 061): the fleet pages keep excluding
// never-launched survivors.
//
// Refonte « registre » (2026-10-03): the title and its lead, the four counts between
// two rules, then ONE register of ideas in the fleet's grammar. The cards and their
// repeated sketch are gone (audit 2026-10, n° 41); the sketch lives on the idea page.
//
// No `revalidate` export on purpose: reading `searchParams` makes this route dynamic,
// so a shared filtered URL renders its filtered list on first paint (as /overview).
// The read itself is cached for 30 minutes below.
import type { Metadata } from 'next'
import Link from 'next/link'
import { unstable_cache } from 'next/cache'
import LibraryIndex, { type IdeaRowData } from '@/components/library/LibraryIndex'
import { IDEA_STARS_LIVE, getIdeaStarCounts, getLibraryIdeas, ideaSlug } from '@/lib/library'
import { defaultLibrarySort, parseLibraryFilters } from '@/lib/library-filters'
import { getLibraryScores } from '@/lib/library-score-data'
import type { IdeaScore } from '@/lib/library-score'
import { engineBaseLabel } from '@/lib/engine-base-labels'
import { familyLabel, type Family } from '@/lib/families'
import { linkClass } from '@/lib/link-roles'
import { LibraryFigure as Figure, LibraryFigures } from '@/components/library/LibraryFigures'

export const metadata: Metadata = {
  title: 'La bibliothèque des stratégies qui ont survécu',
  description:
    'Toutes les variantes de stratégies qui ont passé mes épreuves de backtest, rangées par idée : celles qui tournent en simulation et celles qui attendent leur tour.',
  alternates: { canonical: 'https://algoproof.fr/bibliotheque' },
  openGraph: { url: 'https://algoproof.fr/bibliotheque' },
}

// About 80 rows of counts: far under the data cache's 2 MB ceiling (queries.ts).
const getIdeasCached = unstable_cache(getLibraryIdeas, ['library-ideas'], { revalidate: 1800, tags: ['library'] })
const getStarCountsCached = unstable_cache(getIdeaStarCounts, ['library-idea-star-counts'], { revalidate: 1800, tags: ['library'] })

function toURLSearchParams(sp: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(sp)) {
    if (value === undefined) continue
    params.set(key, Array.isArray(value) ? value[0] : value)
  }
  return params
}

const fr = (n: number) => n.toLocaleString('fr-FR')

/** Lot 2c scores; a failed read costs the scores, never the page (the rows fall back to
 *  the per-variant split and the default order stays « Plus de variantes »). */
async function scoresOrEmpty(): Promise<Record<string, IdeaScore>> {
  try {
    return await getLibraryScores()
  } catch (e) {
    console.error('[bibliotheque] scores unavailable:', e instanceof Error ? e.message : e)
    return {}
  }
}

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function BibliothequePage({ searchParams }: Props) {
  const [ideas, scores, kept, sp] = await Promise.all([getIdeasCached(), scoresOrEmpty(), getStarCountsCached(), searchParams])
  const rows: IdeaRowData[] = ideas.map(i => ({
    ...i,
    score: scores[i.idea_key] ?? null,
    kept: kept[ideaSlug(i.idea_key)] ?? 0,
    slug: ideaSlug(i.idea_key),
    label: engineBaseLabel(i.base),
    familyLabel: familyLabel(i.family as Family),
  }))
  const sum = (k: 'n_variants' | 'n_live' | 'n_paper' | 'n_backtest') => rows.reduce((n, i) => n + i[k], 0)
  const live = sum('n_live')
  const defaultSort = defaultLibrarySort(rows)

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 sm:pt-12 pb-16">
      <header className="mb-7 sm:mb-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">La bibliothèque des stratégies</h1>
        <p className="mt-3 max-w-[64ch] text-base text-muted sm:text-lg">
          Chaque variante que mon moteur a trouvée et qui a passé mes épreuves de backtest est ici,
          lancée ou pas encore. Je les range par idée : une stratégie sur un horizon, avec toutes ses
          variantes derrière.
        </p>
        <p className="mt-3 max-w-[64ch] text-sm text-muted">
          Les bots que j’ai écrits à la main n’y sont pas encore : tous ceux qui tournent se suivent
          sur{' '}<Link href="/overview" className={linkClass('inline')}>La flotte</Link>. Comment marche
          chaque stratégie, et comment je les teste, c’est dans{' '}
          <Link href="/strategies" className={linkClass('inline')}>les fiches</Link>.
        </p>
      </header>

      {rows.length > 0 && (
        <LibraryFigures count={live > 0 ? 5 : 4} closed={false}>
          <Figure value={rows.length} label={rows.length > 1 ? 'idées' : 'idée'} phrase="Une stratégie sur un horizon." />
          <Figure value={sum('n_variants')} label={sum('n_variants') > 1 ? 'variantes' : 'variante'} phrase="Passées par mes épreuves de backtest." />
          {live > 0 && <Figure value={live} label="en argent réel" phrase="Lancées avec mon argent." />}
          <Figure value={sum('n_paper')} label="en simulation" phrase="Lancées, sans argent." />
          <Figure value={sum('n_backtest')} label="en backtest seul" phrase="Pas encore lancées : la page de chaque idée dit pourquoi." />
        </LibraryFigures>
      )}

      <section aria-labelledby="library-register-title" className="border-t border-border pt-8">
        <h2 id="library-register-title" className="mb-5 text-2xl font-semibold tracking-tight">
          Toutes les idées{' '}<span className="font-normal tabular-nums text-muted">{fr(rows.length)}</span>
        </h2>
        <LibraryIndex ideas={rows} defaultSort={defaultSort} stars={IDEA_STARS_LIVE}
          initialState={parseLibraryFilters(toURLSearchParams(sp), defaultSort)} />
      </section>
    </div>
  )
}
