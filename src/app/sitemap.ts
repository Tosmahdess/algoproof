import fs from 'node:fs'
import path from 'node:path'
import { getBotSlugs } from '@/lib/queries'
import { getFicheSitemapData } from '@/lib/equity'
import { STRATEGY_FICHES } from '@/lib/strategy-library'

function getBlogSlugs(): string[] {
  try {
    return fs.readdirSync(path.join(process.cwd(), 'content/blog'))
      .filter(f => f.endsWith('.mdx'))
      .map(f => f.replace(/\.mdx$/, ''))
  } catch {
    return []
  }
}

export default async function sitemap() {
  let slugs: string[] = []
  try { slugs = await getBotSlugs() } catch { /* build-time network error — continue with empty slugs */ }

  let fiches: { ticker: string; generated_at: string }[] = []
  try { fiches = await getFicheSitemapData() } catch { /* build-time network error — continue */ }

  const ficheUrls = fiches.map(f => ({
    url: `https://algoproof.fr/wealth/${encodeURIComponent(f.ticker)}`,
    lastModified: new Date(f.generated_at),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  // Bot fiches: real, but they churn as the engine promotes and archives.
  const botUrls = slugs.map(slug => ({
    url: `https://algoproof.fr/strategies/bot/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }))

  // Concept pages: stable URLs that survive bot turnover. This is the SEO surface.
  const conceptUrls = STRATEGY_FICHES.map(f => ({
    url: `https://algoproof.fr/strategies/${f.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }))

  return [
    {
      url: 'https://algoproof.fr',
      lastModified: new Date(),
      changeFrequency: 'hourly' as const,
      priority: 1.0,
    },
    // FIX (final whole-branch review, I3): /overview was the one page missing
    // from this list. It absorbed /performance (see next.config.ts redirects),
    // carries the FAQ JSON-LD, and its own source comment says it is meant to
    // be indexed — while the 22 concept pages below sit at 0.9. Listed at the
    // bare path only: the family/status/venue/asset/tf/sort parameter space is
    // disallowed in robots.ts and must never enter the sitemap (asserted in
    // tests/lib/sitemap-canonical.test.ts).
    {
      url: 'https://algoproof.fr/overview',
      lastModified: new Date(),
      changeFrequency: 'hourly' as const,
      priority: 0.9,
    },
    {
      url: 'https://algoproof.fr/strategies',
      lastModified: new Date(),
      changeFrequency: 'hourly' as const,
      priority: 0.9,
    },
    {
      url: 'https://algoproof.fr/intelligence',
      lastModified: new Date(),
      changeFrequency: 'hourly' as const,
      priority: 0.8,
    },
    {
      url: 'https://algoproof.fr/wealth',
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: 'https://algoproof.fr/blog',
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: 'https://algoproof.fr/mica',
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: 'https://algoproof.fr/preuve',
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: 'https://algoproof.fr/journal',
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    { url: 'https://algoproof.fr/a-propos', lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: 'https://algoproof.fr/lexique', lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: 'https://algoproof.fr/faq', lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.6 },
    ...['flotte', 'intelligence', 'patrimoine'].map(flux => ({
      url: `https://algoproof.fr/journal/${flux}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...getBlogSlugs().map(slug => ({
      url: `https://algoproof.fr/blog/${slug}`,
      // Filenames start with the publication date (YYYY-MM-DD-slug).
      lastModified: /^\d{4}-\d{2}-\d{2}/.test(slug) ? new Date(slug.slice(0, 10)) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...ficheUrls,
    ...botUrls,
    ...conceptUrls,
  ]
}
