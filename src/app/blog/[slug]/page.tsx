// src/app/blog/[slug]/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { mdxComponents } from '@/components/mdx/MDXComponents'
import { BLOG_CATEGORIES, type BlogCategory } from '@/lib/blog-categories'

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

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <div className="flex items-center gap-2 text-xs text-muted mb-6">
        {article.meta.category && (() => {
          const cat = BLOG_CATEGORIES[article.meta.category as BlogCategory]
          return cat ? (
            <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wider ${cat.color}`}>
              {cat.label}
            </span>
          ) : null
        })()}
        <time>{new Date(article.meta.date as string).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</time>
        {(article.meta.tags as string[])?.map((t: string) => (
          <span key={t} className="px-1.5 py-0.5 rounded bg-card border border-border">{t}</span>
        ))}
      </div>
      <h1 className="text-3xl font-bold mb-8">{article.meta.title as string}</h1>
      <div className="prose prose-invert prose-base max-w-none prose-headings:font-semibold prose-p:text-foreground/70 prose-p:leading-relaxed prose-li:text-foreground/70 prose-li:my-1 prose-a:text-accent prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground/90">
        <MDXRemote source={article.content} components={mdxComponents} />
      </div>
    </div>
  )
}
