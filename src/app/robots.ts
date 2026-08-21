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
      // One rule per src/lib/bot-filters.ts's PARAM_ORDER, in that order.
      // Fix round 1: `dir` was missing here (only caught today by the blanket
      // /overview?* rule). Kept in sync with PARAM_ORDER by
      // tests/lib/robots-facets.test.ts, since these rules are also
      // order-sensitive — robots.txt `*` cannot rewind past a literal `?`, so
      // `/*?family=` only matches a URL where `family` is the FIRST query
      // parameter. That holds today only because serializeFleetFilters always
      // emits PARAM_ORDER in this fixed order.
      disallow: [
        '/overview?*',
        '/*?family=',
        '/*?status=',
        '/*?venue=',
        '/*?asset=',
        '/*?side=',
        '/*?tf=',
        '/*?sort=',
        '/*?dir=',
      ],
    },
    sitemap: 'https://algoproof.fr/sitemap.xml',
  }
}
