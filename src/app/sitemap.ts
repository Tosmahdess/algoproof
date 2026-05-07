import { getBotSlugs } from '@/lib/queries'

export default async function sitemap() {
  const slugs = await getBotSlugs()

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
    ...strategyUrls,
  ]
}
