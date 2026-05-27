// src/app/blog/page.tsx
import type { Metadata } from 'next'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import type { BlogCategory } from '@/lib/blog-categories'
import { BlogListClient } from '@/components/BlogListClient'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Blog — AlgoProof',
  description: 'Journal de bord, analyses de stratégies, insights en trading algo et bilans de performance honnêtes.',
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
  return <BlogListClient articles={articles} />
}
