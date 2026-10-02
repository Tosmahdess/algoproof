// One article on the home (refonte « Le registre des décisions », lot 2): the
// latest that is not a daily journal, the rule HomeArticles applied to three since
// lot 3, so the reader meets a piece of method or an autopsy. Its title, one
// sentence of its summary, and the way in. No label above it (owner, 02/10).
import Link from 'next/link'
import { linkClass } from '@/lib/link-roles'
import type { ArticleMeta } from '@/lib/articles'
import { firstSentence } from '@/lib/home-register'

/** The article the home shows: the newest that is not a daily journal. */
export function pickHomeArticle(articles: readonly ArticleMeta[]): ArticleMeta | null {
  return articles.find(a => a.category !== 'journal') ?? null
}

export default function HomeArticle({ articles }: { articles: ArticleMeta[] }) {
  const a = pickHomeArticle(articles)
  if (!a) return null
  return (
    <div data-testid="home-article">
      <h2 className="text-xl font-semibold leading-snug sm:text-2xl">{a.title}</h2>
      {a.summary && <p className="mt-2.5 text-muted">{firstSentence(a.summary)}</p>}
      <Link href={`/blog/${a.slug}`} className={linkClass('inline', 'mt-1 inline-flex min-h-11 items-center')}>
        Lire l’article →
      </Link>
    </div>
  )
}
