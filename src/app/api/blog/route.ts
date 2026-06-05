import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export const runtime = 'nodejs'
export const revalidate = 3600

export async function GET() {
  const dir = path.join(process.cwd(), 'content/blog')
  if (!fs.existsSync(dir)) return NextResponse.json([])
  const posts = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => {
      const raw = fs.readFileSync(path.join(dir, f), 'utf-8')
      const { data } = matter(raw)
      const slug = f.replace(/\.mdx$/, '')
      const rawDate = data.date
      const date =
        rawDate instanceof Date
          ? rawDate.toISOString().slice(0, 10)
          : String(rawDate ?? '')
      return {
        slug,
        title: data.title ?? '',
        date,
        summary: data.summary ?? '',
        tags: data.tags ?? [],
        category: data.category ?? null,
        url: `/blog/${slug}`,
      }
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1))
  return NextResponse.json(posts)
}
