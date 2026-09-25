// The blog's article index, read from content/blog. Lived inside app/blog/page.tsx
// until lot 3 of the design audit (2026-09-25): the home lists three articles too,
// and a page file is not a module another page should import for its data.
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import type { BlogCategory } from '@/lib/blog-categories'

export interface ArticleMeta {
  slug: string
  title: string
  date: string
  summary: string
  tags: string[]
  category: BlogCategory
}

export function getArticles(): ArticleMeta[] {
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
