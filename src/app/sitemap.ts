import { getBotSlugs } from '@/lib/queries'
import { getFicheSitemapData } from '@/lib/equity'

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

  const strategyUrls = slugs.map(slug => ({
    url: `https://algoproof.fr/strategies/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'hourly' as const,
    priority: 1.0,
  }))

  return [
    {
      url: 'https://algoproof.fr',
      lastModified: new Date(),
      changeFrequency: 'hourly' as const,
      priority: 1.0,
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
    ...['flotte', 'intelligence', 'patrimoine'].map(flux => ({
      url: `https://algoproof.fr/journal/${flux}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...ficheUrls,
    ...strategyUrls,
  ]
}
