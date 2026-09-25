// src/app/blog/page.tsx
import type { Metadata } from 'next'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import type { BlogCategory } from '@/lib/blog-categories'
import { BlogListClient } from '@/components/BlogListClient'
import JsonLd from '@/components/JsonLd'
import { faqJsonLd } from '@/lib/jsonld'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Apprendre le trading algo : guides, méthode, fiscalité, MiCA',
  description: 'Des articles pour comprendre comment je travaille : débuter, ma méthode de recherche, la fiscalité crypto 2026 et la conformité MiCA en France.',
}

// The index moved to lib/articles.ts (lot 3): the home lists three articles too.
// Re-exported so BlogListClient keeps its import path.
export type { ArticleMeta } from '@/lib/articles'
import { getArticles } from '@/lib/articles'

export default function BlogPage() {
  const articles = getArticles()
  return (
    <>
      <JsonLd data={faqJsonLd([
        { question: 'Pour qui sont ces articles ?', answer: 'Pour les curieux qui débutent comme pour les traders qui veulent voir la méthode en détail.' },
        { question: 'Faut-il un compte pour lire ?', answer: 'Non, tout le blog est en accès libre.' },
        { question: 'Parles-tu de fiscalité et de MiCA ?', answer: 'Oui, des guides dédiés expliquent la fiscalité crypto 2026 et le règlement MiCA pour les particuliers en France.' },
      ])} />
      <BlogListClient articles={articles} />
    </>
  )
}
