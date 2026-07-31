import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // The fleet filters live in query parameters so a view can be shared and
      // the back button works. They are NOT an SEO surface: Google's faceted
      // navigation guidance asks that facet URLs not be crawled, and canonical
      // or nofollow are called less effective long term. SEO is carried by the
      // concept pages and the bot fiches, which are parameter-free.
      disallow: [
        '/overview?*',
        '/*?family=',
        '/*?status=',
        '/*?venue=',
        '/*?asset=',
        '/*?tf=',
        '/*?sort=',
      ],
    },
    sitemap: 'https://algoproof.fr/sitemap.xml',
  }
}
