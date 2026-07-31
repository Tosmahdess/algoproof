import { describe, it, expect } from 'vitest'
import { incarnationsOf } from '@/lib/incarnations'
import { STRATEGY_FICHES } from '@/lib/strategy-library'
import { FIXTURE_FLEET } from '../fixtures/bots'

describe('concept pages', () => {
  it('generates a static param for every fiche', () => {
    expect(STRATEGY_FICHES.map(f => ({ concept: f.slug }))).toHaveLength(22)
  })

  it('a fiche with no deployed bot yields an empty incarnation list, not an error', () => {
    for (const f of STRATEGY_FICHES) {
      expect(Array.isArray(incarnationsOf(f, FIXTURE_FLEET))).toBe(true)
    }
  })

  it('no fiche slug collides with the reserved /strategies/bot segment', () => {
    expect(STRATEGY_FICHES.some(f => f.slug === 'bot')).toBe(false)
  })
})
