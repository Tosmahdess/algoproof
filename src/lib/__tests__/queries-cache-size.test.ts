import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { cacheSizeWarning, CACHE_TRADE_WARN } from '@/lib/queries'

// Next's data cache refuses entries over 2 MB WITHOUT throwing anywhere catchable: the
// write simply never happens. That is how one 3.49 MB aggregate entry made unstable_cache
// a no-op on four pages. These guards exist so the same thing cannot come back quietly.

describe('cacheSizeWarning', () => {
  it('stays silent for a normal bot', () => {
    expect(cacheSizeWarning('orb-bf25', 230)).toBeNull()
  })

  it('stays silent for the largest bot measured today', () => {
    // funding-rate-harvest, 3 375 trades / 1 290 KB on 2026-08-09.
    expect(cacheSizeWarning('funding-rate-harvest', 3375)).toBeNull()
  })

  it('warns before the ceiling is reached, not after', () => {
    // ~0.386 KB per trade row => the 2 MB ceiling lands near 5 300 trades. The threshold
    // has to sit BELOW that, or the warning arrives once the cache is already broken.
    expect(CACHE_TRADE_WARN).toBeLessThan(5300)
    const w = cacheSizeWarning('funding-rate-harvest', CACHE_TRADE_WARN + 1)
    expect(w).toContain('funding-rate-harvest')
    expect(w).toContain('SILENTLY')
  })
})

describe('the aggregate reader is not re-wrapped in unstable_cache', () => {
  // A behavioural test cannot see this: re-wrapping getAllBotsWithStats would keep every
  // page rendering exactly the same output, while silently restoring the no-op cache and
  // the dev-server crash. The only surface that shows it is the source.
  const src = readFileSync('src/lib/queries.ts', 'utf8')

  it('caches per slug, where entries fit under the ceiling', () => {
    expect(src).toMatch(/unstable_cache\(\s*\(\)\s*=>\s*getBotWithStats\(slug\)/)
  })

  it('does not wrap the 3.5 MB composition', () => {
    expect(src).not.toMatch(/unstable_cache\(\s*getAllBotsWithStatsUncached/)
  })
})
