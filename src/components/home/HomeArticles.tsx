// Three articles on the home (lot 3, conception §5.1): the latest that are neither
// a daily journal nor a weekly review, so the reader meets a piece of method or an
// autopsy, not the third « Quand le marché hésite » of the month.
import Link from 'next/link'
import { linkClass } from '@/lib/link-roles'
import type { ArticleMeta } from '@/lib/articles'
import { BLOG_CATEGORIES } from '@/lib/blog-categories'
import { mediumDate } from '@/lib/format-date'

export default function HomeArticles({ articles }: { articles: ArticleMeta[] }) {
  const picks = articles.filter(a => a.category !== 'journal' && a.category !== 'weekly').slice(0, 3)
  if (picks.length === 0) return null
  return (
    <section data-testid="home-articles" aria-labelledby="home-articles-title" className="mb-12">
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <h2 id="home-articles-title" className="text-xl font-semibold">Trois articles</h2>
        <Link href="/blog" className={linkClass('inline', 'text-sm')}>Tous les articles</Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {picks.map(a => (
          <Link key={a.slug} href={`/blog/${a.slug}`} className={linkClass('card', 'p-4')}>
            <p className="text-xs text-muted mb-1.5"><span className="text-foreground font-medium">{BLOG_CATEGORIES[a.category]?.label ?? a.category}</span> · {mediumDate(a.date)}</p>
            <p className="text-sm font-semibold leading-snug">{a.title}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
