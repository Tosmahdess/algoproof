'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ArticleMeta } from '@/app/blog/page'
import { BLOG_CATEGORIES, CATEGORY_ORDER, type BlogCategory } from '@/lib/blog-categories'

const PINNED_SLUGS = [
  '2026-06-25-momentum-crypto-de-grossing',
  '2026-07-02-pourquoi-mes-bots-ne-tradent-pas',
]

export function BlogListClient({ articles }: { articles: ArticleMeta[] }) {
  const [filter, setFilter] = useState<BlogCategory | null>(null)

  const filtered = filter ? articles.filter(a => a.category === filter) : articles

  const counts = articles.reduce<Record<string, number>>((acc, a) => {
    acc[a.category] = (acc[a.category] || 0) + 1
    return acc
  }, {})

  const pinned = PINNED_SLUGS
    .map(slug => articles.find(a => a.slug === slug))
    .filter((a): a is ArticleMeta => a !== undefined)

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-6">Articles</h1>
      <p className="text-sm text-muted max-w-2xl mb-6">
        Des articles pour comprendre comment je travaille : débuter, ma méthode de recherche, la fiscalité crypto et la conformité <strong>MiCA</strong> en France.
      </p>

      {/* Pinned articles */}
      {pinned.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xs font-semibold tracking-widest uppercase text-muted mb-3">À lire d&apos;abord</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pinned.map(a => (
              <Link
                key={a.slug}
                href={`/blog/${a.slug}`}
                className="bg-card border border-border rounded-xl p-5 hover:border-positive/30 transition-colors group"
              >
                <h3 className="font-semibold group-hover:text-positive transition-colors mb-1.5">{a.title}</h3>
                <p className="text-muted text-xs">{a.summary}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2 mb-10">
        <button
          onClick={() => setFilter(null)}
          className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
            filter === null
              ? 'bg-foreground/10 border-foreground/30 text-foreground'
              : 'border-border text-muted hover:text-foreground hover:border-foreground/30'
          }`}
        >
          Tous ({articles.length})
        </button>
        {CATEGORY_ORDER.map(cat => {
          const meta = BLOG_CATEGORIES[cat]
          const count = counts[cat] || 0
          if (count === 0) return null
          return (
            <button
              key={cat}
              onClick={() => setFilter(filter === cat ? null : cat)}
              className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                filter === cat ? meta.color : 'border-border text-muted hover:text-foreground hover:border-foreground/30'
              }`}
            >
              {meta.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Article list */}
      <div className="space-y-8">
        {filtered.map(a => {
          const catMeta = BLOG_CATEGORIES[a.category]
          return (
            <article key={a.slug} className="border-b border-border pb-8">
              <div className="flex items-center gap-2 text-xs text-muted mb-2">
                <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wider ${catMeta.color}`}>
                  {catMeta.label}
                </span>
                <time>{new Date(a.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</time>
              </div>
              <h2 className="text-xl font-semibold mb-2">
                <Link href={`/blog/${a.slug}`} className="hover:text-positive transition-colors">{a.title}</Link>
              </h2>
              <p className="text-muted text-sm">{a.summary}</p>
              <Link href={`/blog/${a.slug}`} className="text-sm text-positive mt-3 inline-block hover:underline">Lire la suite →</Link>
            </article>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-muted text-sm">Aucun article dans cette catégorie pour l'instant.</p>
        )}
      </div>
    </div>
  )
}
