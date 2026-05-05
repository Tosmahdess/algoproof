// src/app/blog/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Strategy updates, algo trading insights, and honest performance reviews.',
}

interface ArticleMeta {
  slug: string
  title: string
  date: string
  summary: string
  tags: string[]
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
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-10">Blog</h1>
      <div className="space-y-8">
        {articles.map(a => (
          <article key={a.slug} className="border-b border-border pb-8">
            <div className="flex items-center gap-2 text-xs text-muted mb-2">
              <time>{new Date(a.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</time>
              {a.tags.map(t => (
                <span key={t} className="px-1.5 py-0.5 rounded bg-card border border-border">{t}</span>
              ))}
            </div>
            <h2 className="text-xl font-semibold mb-2">
              <Link href={`/blog/${a.slug}`} className="hover:text-positive transition-colors">{a.title}</Link>
            </h2>
            <p className="text-muted text-sm">{a.summary}</p>
            <Link href={`/blog/${a.slug}`} className="text-sm text-positive mt-3 inline-block hover:underline">Read more →</Link>
          </article>
        ))}
      </div>
    </div>
  )
}
