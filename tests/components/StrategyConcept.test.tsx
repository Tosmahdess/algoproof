import { describe, it, expect } from 'vitest'
import { incarnationsOf } from '@/lib/incarnations'
import { STRATEGY_FICHES } from '@/lib/strategy-library'
import { FIXTURE_FLEET } from '../fixtures/bots'

describe('concept pages', () => {
  it('generates a static param for every fiche', () => {
    expect(STRATEGY_FICHES.map(f => ({ concept: f.slug }))).toHaveLength(22)
  })

  // `Array.isArray` is true for any filter() result — this used to pass
  // whether or not the join actually matched anything. FIXTURE_FLEET carries
  // real ema-cross, orb, macd, ichimoku, ema-ribbon and donchian bots, so
  // assert the split: those fiches get a non-empty list, everything else
  // stays empty.
  const COVERED_FICHES = new Set([
    'ema-cross', 'orb', 'macd', 'ichimoku', 'ema-ribbon', 'donchian',
  ])

  it('lists incarnations for fiches the fixture fleet actually deploys, and nothing for the rest', () => {
    for (const f of STRATEGY_FICHES) {
      const count = incarnationsOf(f, FIXTURE_FLEET).length
      if (COVERED_FICHES.has(f.slug)) {
        expect(count, f.slug).toBeGreaterThan(0)
      } else {
        expect(count, f.slug).toBe(0)
      }
    }
  })

  // The "no fiche slug collides with the reserved bot segment" assertion used
  // to be duplicated here and in tests/lib/strategy-routing.test.ts (fix
  // round 1) — kept in strategy-routing.test.ts only, which is the file about
  // routing collisions.
})
