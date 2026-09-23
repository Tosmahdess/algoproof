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
    // 0.095 KB per row in the FLEET projection (measured: 5 511 rows = 520 681 B),
    // so the 2 MB ceiling lands near 22 000. The threshold sits below that, and
    // above the largest bot today, or it cries wolf at every build — which is
    // precisely how the real breach went unread.
    expect(CACHE_TRADE_WARN).toBeLessThan(22000)
    expect(CACHE_TRADE_WARN).toBeGreaterThan(6000)
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
    expect(src).toMatch(/unstable_cache\([\s\S]{0,400}?\[['"]fleet-bot['"], slug\]/)
  })

  // And the per-slug entry has to STAY under the ceiling. Measured 2026-09-23:
  // funding-rate-harvest at 5511 trades serialises to 2 112 768 B with
  // select('*') — over the 2 MB limit, so its entry was stored nowhere and its
  // fetch ran again on every request to four page families. The four columns
  // the fleet reads come to 520 681 B. Pinning the projection here because the
  // breach is invisible at runtime: no error, no log, just a cache that holds
  // nothing.
  it('feeds that entry the fleet projection, not whole trade rows', () => {
    expect(src).toMatch(/TRADE_COLUMNS_FLEET = 'side,pnl,asset,closed_at'/)
    expect(src).toMatch(/fetchBotWithStats\(slug, TRADE_COLUMNS_FLEET\)/)
  })

  it('does not wrap the 3.5 MB composition', () => {
    expect(src).not.toMatch(/unstable_cache\(\s*getAllBotsWithStatsUncached/)
  })
})
