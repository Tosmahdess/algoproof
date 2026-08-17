import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { BOT_PARAMS } from '@/lib/bot-params'

// The producer side of the invariant. BOT_PARAMS is consumed by a strict
// lookup (getBotParams -> BOT_PARAMS[slug] ?? null), so a key that does not
// match a published slug silently renders nothing. A fixture written here by
// hand would stay green whatever vps_sync.py publishes, so we read the
// publisher itself: it is the authority on bots.slug.
function publishedSlugs(): string[] {
  const src = readFileSync(join(process.cwd(), 'scripts', 'vps_sync.py'), 'utf8')
  const out = new Set<string>()
  for (const m of src.matchAll(/"slug":\s*"([a-z0-9-]+)"/g)) out.add(m[1])
  return [...out]
}

describe('BOT_PARAMS keys vs published bot slugs', () => {
  it('reads a non-trivial number of slugs from the publisher', () => {
    // Guard: if the regex ever stops matching, every assertion below would
    // pass vacuously. This is the fixture-produces-nothing failure mode.
    expect(publishedSlugs().length).toBeGreaterThan(20)
  })

  it('has no BOT_PARAMS key that is not a published slug', () => {
    const published = new Set(publishedSlugs())
    const orphans = Object.keys(BOT_PARAMS).filter((k) => !published.has(k))
    expect(orphans).toEqual([])
  })

  it('resolves the two non-crypto bots by their published slug', () => {
    expect(BOT_PARAMS['keltner-xau-hl']).toBeDefined()
    expect(BOT_PARAMS['emacross-eur-usd']).toBeDefined()
  })
})
