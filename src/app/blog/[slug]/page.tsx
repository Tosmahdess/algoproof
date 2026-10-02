// src/app/blog/[slug]/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { mdxComponents } from '@/components/mdx/MDXComponents'
import { BLOG_CATEGORIES, type BlogCategory } from '@/lib/blog-categories'
import { longDate } from '@/lib/format-date'

export const dynamicParams = false

function getArticle(slug: string) {
  const filePath = path.join(process.cwd(), 'content/blog', `${slug}.mdx`)
  if (!fs.existsSync(filePath)) return null
  const raw = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(raw)
  return { meta: data, content }
}

export async function generateStaticParams() {
  const dir = path.join(process.cwd(), 'content/blog')
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.mdx'))
    .map(f => ({ slug: f.replace('.mdx', '') }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const article = getArticle(slug)
  if (!article) return {}
  return {
    title: article.meta.title as string,
    description: (article.meta.summary ?? article.meta.title) as string,
    // Daily LLM journals are near-duplicate scaled content (same regime restated every
    // day) — noindex so they don't dilute; keep follow so their links are still crawled.
    // Real articles stay indexable (D026, 2026-07-03); the weekly recaps were retired on 2026-09-29.
    robots: article.meta.category === 'journal' ? { index: false, follow: true } : undefined,
    openGraph: {
      type: 'article',
      url: `https://algoproof.fr/blog/${slug}`,
      publishedTime: article.meta.date as string,
    },
  }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = getArticle(slug)
  if (!article) notFound()

  const cat = article.meta.category ? BLOG_CATEGORIES[article.meta.category as BlogCategory] : undefined
  // Refonte finition (2026-10-02): the title first; the category sits in the date line
  // under it, in the note ink like the article list (the amber reserve is kept for
  // insufficient data). The prose reads at 18 px, 1.65 line height, 66 characters.
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight mb-3">{article.meta.title as string}</h1>
      <div data-testid="article-meta" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted mb-10">
        <p>
          {cat ? `${cat.label} · ` : ''}
          <time dateTime={article.meta.date as string}>{longDate(article.meta.date as string)}</time>
        </p>
        {(article.meta.tags as string[])?.map((t: string) => (
          <span key={t} className="px-1.5 py-0.5 rounded bg-card border border-border">{t}</span>
        ))}
      </div>
      <div className="prose prose-invert max-w-[66ch] text-[18px] leading-[1.65] prose-headings:font-semibold prose-p:text-foreground prose-p:leading-[1.65] prose-li:text-foreground prose-li:leading-[1.65] prose-li:my-1 prose-a:text-accent prose-a:underline prose-a:decoration-accent/40 prose-a:underline-offset-2 hover:prose-a:decoration-accent prose-strong:text-foreground">
        <MDXRemote source={article.content} components={mdxComponents} />
      </div>
      <div className="mt-12">
      </div>
    </div>
  )
}
