'use client'

import StickyFilterBar from '@/components/StickyFilterBar'
import { linkClass } from '@/lib/link-roles'
import { useState } from 'react'
import Link from 'next/link'
import type { ArticleMeta } from '@/app/blog/page'
import { BLOG_CATEGORIES, CATEGORY_ORDER, type BlogCategory } from '@/lib/blog-categories'
import { STRATEGY_FICHES } from '@/lib/strategy-library'
import { mediumDate } from '@/lib/format-date'

const PINNED_SLUGS = [
  '2026-06-25-momentum-crypto-de-grossing',
  '2026-07-02-pourquoi-mes-bots-ne-tradent-pas',
]

// Lot 7 (spec 5.8): the weekly reviews are compact rows, 8 visible, the rest on
// demand. The other categories stay cards. Categories and URLs do not change.
const WEEKLY_VISIBLE = 8

/** The first sentence of a summary: the full one is in the article. */
function firstSentence(s: string): string {
  const m = s.trim().match(/^[^.!?]*[.!?](?=\s|$)/)
  return m ? m[0] : s.trim()
}

const PILL = (active: boolean) =>
  `inline-flex items-center h-10 px-3 text-sm rounded border transition-colors ${
    active
      ? 'border-accent text-accent'
      : 'border-border text-muted hover:text-foreground hover:border-strong'
  }`

export function BlogListClient({ articles }: { articles: ArticleMeta[] }) {
  const [filter, setFilter] = useState<BlogCategory | null>(null)
  const [allWeekly, setAllWeekly] = useState(false)

  // D026 (2026-07-03): daily journals drowned the real articles — hidden from the
  // default view, still reachable via the « Journal de bord » pill (no URL broken).
  const defaultVisible = articles.filter(a => a.category !== 'journal')
  const filtered = filter ? articles.filter(a => a.category === filter) : defaultVisible

  const cards = filtered.filter(a => a.category !== 'weekly')
  const weekly = filtered.filter(a => a.category === 'weekly')
  const weeklyShown = allWeekly ? weekly : weekly.slice(0, WEEKLY_VISIBLE)
  const weeklyHidden = weekly.length - weeklyShown.length

  const counts = articles.reduce<Record<string, number>>((acc, a) => {
    acc[a.category] = (acc[a.category] || 0) + 1
    return acc
  }, {})

  const pinned = PINNED_SLUGS
    .map(slug => articles.find(a => a.slug === slug))
    .filter((a): a is ArticleMeta => a !== undefined)

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight mb-3">Articles</h1>
      <p data-testid="blog-intro" className="text-base text-muted max-w-2xl mb-4">
        Ce que je fais, comment je le vérifie, et ce que ça donne, semaine après semaine.
      </p>

      {/* Apprendre en pratique : the lab's entries, one line of links (2e chemin de decouverte) */}
      <p data-testid="apprendre-en-pratique" className="text-sm text-muted mb-10">
        Apprendre en pratique :{' '}
        <a href="https://lab.algoproof.fr/apprendre" className={linkClass('inline')}>les tutoriels du labo</a>
        {' · '}
        <a href="/strategies" className={linkClass('inline')}>les {STRATEGY_FICHES.length} stratégies expliquées</a>
        {' · '}
        <a href="https://lab.algoproof.fr/agents" className={linkClass('inline')}>le serveur MCP pour ton agent IA</a>
      </p>

      {/* Pinned articles: title and one sentence, the full summary is in the article */}
      {pinned.length > 0 && (
        <div data-testid="pinned" className="mb-10">
          <h2 className="text-xs font-medium text-muted mb-3">À lire d&apos;abord</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pinned.map(a => (
              <Link
                key={a.slug}
                href={`/blog/${a.slug}`}
                className={linkClass('card', 'bg-card p-5')}
              >
                <h3 className="text-base font-semibold group-hover:text-accent transition-colors mb-1.5">{a.title}</h3>
                <p className="text-muted text-sm">{firstSentence(a.summary)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Category filter pills, 40 px tap targets */}
      <StickyFilterBar activeCount={filter === null ? 0 : 1} onReset={() => setFilter(null)}>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter(null)} className={PILL(filter === null)}>
          Tous ({defaultVisible.length})
        </button>
        {CATEGORY_ORDER.map(cat => {
          const meta = BLOG_CATEGORIES[cat]
          const count = counts[cat] || 0
          if (count === 0) return null
          return (
            <button
              key={cat}
              onClick={() => setFilter(filter === cat ? null : cat)}
              className={PILL(filter === cat)}
            >
              {meta.label} ({count})
            </button>
          )
        })}
      </div>
      </StickyFilterBar>

      {filter === null && (counts['journal'] || 0) > 0 && (
        <p className="text-xs text-muted mb-8">
          Les journaux de bord quotidiens ({counts['journal']}) ne sont plus mis en avant : la synthèse
          se fait dans la revue hebdo. Ils restent consultables via le filtre « Journal de bord ».
        </p>
      )}

      {/* Cards: Méthode / Stratégie / Bilan / Guide (and journals when asked for) */}
      {cards.length > 0 && (
        <div className="space-y-6">
          {cards.map(a => (
            <article key={a.slug} data-testid="article-card" className="border-b border-border pb-6">
              <p className="text-xs text-muted mb-1.5">
                {BLOG_CATEGORIES[a.category].label} · <time dateTime={a.date}>{mediumDate(a.date)}</time>
              </p>
              <h2 className="text-lg font-semibold mb-1.5">
                <Link href={`/blog/${a.slug}`} className={linkClass('record')}>{a.title}</Link>
              </h2>
              <p className="text-muted text-sm">{firstSentence(a.summary)}</p>
            </article>
          ))}
        </div>
      )}

      {/* Weekly reviews: compact rows, date · title */}
      {weekly.length > 0 && (
        <section className={cards.length > 0 ? 'mt-10' : ''}>
          <h2 className="text-xs font-medium text-muted mb-3">
            Revues hebdo ({weekly.length})
          </h2>
          <ul className="divide-y divide-border border-y border-border">
            {weeklyShown.map(a => (
              <li key={a.slug} data-testid="weekly-row" className="flex items-baseline gap-4 py-2.5 text-sm">
                <time dateTime={a.date} className="shrink-0 font-mono text-xs text-muted w-24">{mediumDate(a.date)}</time>
                <Link href={`/blog/${a.slug}`} className={linkClass('record')}>{a.title}</Link>
              </li>
            ))}
          </ul>
          {weeklyHidden > 0 && (
            <button
              type="button"
              onClick={() => setAllWeekly(true)}
              className="mt-3 inline-flex items-center h-10 px-3 text-sm rounded border border-border text-muted hover:text-foreground hover:border-strong transition-colors"
            >
              Afficher les {weeklyHidden} autres
            </button>
          )}
        </section>
      )}

      {filtered.length === 0 && (
        <p className="text-muted text-sm">Aucun article dans cette catégorie pour l&apos;instant.</p>
      )}
    </div>
  )
}
