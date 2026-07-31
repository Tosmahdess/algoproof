import { describe, it, expect } from 'vitest'
import { pathToRegexp } from 'next/dist/compiled/path-to-regexp'
import { STRATEGY_FICHES } from '@/lib/strategy-library'
import config from '../../next.config'

describe('strategy routing', () => {
  it('no redirect source pattern swallows a concept URL', async () => {
    const redirects = await (config as { redirects?: () => Promise<{ source: string }[]> }).redirects?.() ?? []
    // Fix round 1: the original version of this test pattern-matched the
    // source STRING against /^\/strategies\/:[A-Za-z]+$/. That `$` anchor let
    // through anything with a modifier or extra segment — /strategies/:slug*,
    // /strategies/:slug+, /strategies/:slug(.*), /(.*), /:path* — every one of
    // which shadows all 22 concept URLs exactly like the plain form did, and
    // [A-Za-z]+ still let /strategies/:slug2 or /strategies/:bot_slug through
    // too. Compiling each source with the same path-to-regexp Next.js uses
    // internally for redirects() (re-exported at next/dist/compiled — not a
    // public API, but the same matcher next.config's redirects actually run
    // through) and testing it against a REAL concept URL catches every shape
    // at once instead of enumerating spellings.
    for (const f of STRATEGY_FICHES) {
      const url = `/strategies/${f.slug}`
      for (const r of redirects) {
        const matcher = pathToRegexp(r.source)
        expect(matcher.test(url), `${r.source} shadows ${url}`).toBe(false)
      }
    }
  })

  // Kept here, not duplicated in tests/components/StrategyConcept.test.tsx
  // (fix round 1) — this file is the one about routing collisions.
  it('no fiche slug collides with the reserved bot segment', () => {
    expect(STRATEGY_FICHES.some(f => f.slug === 'bot')).toBe(false)
  })
})
