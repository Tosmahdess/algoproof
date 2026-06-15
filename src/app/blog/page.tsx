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
  title: 'Apprendre le trading algo — guides, méthode, fiscalité, MiCA',
  description: 'Des articles pour comprendre comment je travaille : débuter, ma méthode de recherche, la fiscalité crypto 2026 et la conformité MiCA en France.',
}

export interface ArticleMeta {
  slug: string
  title: string
  date: string
  summary: string
  tags: string[]
  category: BlogCategory
}

function getArticles(): ArticleMeta[] {
  const dir = path.join(process.cwd(), 'content/blog')
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.mdx'))
    .map(f => {
      const { data } = matter(fs.readFileSync(path.join(dir, f), 'utf8'))
      return { slug: f.replace('.mdx', ''), ...data } as ArticleMeta
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export default function BlogPage() {
  const articles = getArticles()
  return (
    <>
      <JsonLd data={faqJsonLd([
        { question: 'Pour qui sont ces articles ?', answer: 'Pour les curieux qui débutent comme pour les traders qui veulent voir la méthode en détail.' },
        { question: 'Faut-il un compte pour lire ?', answer: 'Non, tout le blog est en accès libre.' },
        { question: 'Parlez-vous de fiscalité et de MiCA ?', answer: 'Oui, des guides dédiés expliquent la fiscalité crypto 2026 et le règlement MiCA pour les particuliers en France.' },
      ])} />
      <BlogListClient articles={articles} />
    </>
  )
}
