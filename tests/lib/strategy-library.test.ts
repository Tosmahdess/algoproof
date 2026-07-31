import { describe, it, expect } from 'vitest'
import { STRATEGY_FICHES, getStrategyFiche, fichesByFamily } from '@/lib/strategy-library'
import { FAMILY_ORDER, isFamily } from '@/lib/families'

describe('strategy library', () => {
  it('carries all 22 fiches', () => {
    expect(STRATEGY_FICHES).toHaveLength(22)
  })

  it('gives every fiche a canonical family, not a free-form label', () => {
    for (const f of STRATEGY_FICHES) {
      expect(isFamily(f.family), `${f.slug} has family ${f.family}`).toBe(true)
    }
  })

  it('applies the agreed mapping for the two families that had no equivalent', () => {
    expect(getStrategyFiche('macd')!.family).toBe('momentum')
    expect(getStrategyFiche('roc')!.family).toBe('momentum')
    expect(getStrategyFiche('tsi')!.family).toBe('momentum')
    expect(getStrategyFiche('fvg')!.family).toBe('price-action')
    expect(getStrategyFiche('fvg-multi')!.family).toBe('price-action')
  })

  it('maps the three families that did have an equivalent', () => {
    expect(getStrategyFiche('ema-cross')!.family).toBe('trend')
    expect(getStrategyFiche('orb')!.family).toBe('breakout')
    expect(getStrategyFiche('rsi-mean-reversion')!.family).toBe('mean-reversion')
  })

  it('has unique slugs and unique strategyIds', () => {
    expect(new Set(STRATEGY_FICHES.map(f => f.slug)).size).toBe(22)
    expect(new Set(STRATEGY_FICHES.map(f => f.strategyId)).size).toBe(22)
  })

  it('no longer carries botSlug: incarnations are derived, not hand-written', () => {
    for (const f of STRATEGY_FICHES) {
      expect(f).not.toHaveProperty('botSlug')
    }
  })

  it('returns null for an unknown slug rather than throwing', () => {
    expect(getStrategyFiche('does-not-exist')).toBeNull()
  })

  it('groups by family in canonical display order, skipping empty families', () => {
    const groups = fichesByFamily()
    const order = groups.map(g => g.family)
    const expected = FAMILY_ORDER.filter(f => STRATEGY_FICHES.some(x => x.family === f))
    expect(order).toEqual([...expected])
    expect(groups.every(g => g.fiches.length > 0)).toBe(true)
  })

  it('keeps every fiche non-empty on the fields the page renders', () => {
    for (const f of STRATEGY_FICHES) {
      expect(f.title.length, f.slug).toBeGreaterThan(0)
      expect(f.oneLiner.length, f.slug).toBeGreaterThan(0)
      expect(f.logic.length, f.slug).toBeGreaterThan(0)
      expect(f.worksWhen.length, f.slug).toBeGreaterThan(0)
      expect(f.diesWhen.length, f.slug).toBeGreaterThan(0)
    }
  })

  it('points every lab link at the lab subdomain, absolutely', () => {
    for (const f of STRATEGY_FICHES) {
      expect(f.labHref.startsWith('https://lab.algoproof.fr'), f.slug).toBe(true)
      if (f.presetHref) {
        expect(f.presetHref.startsWith('https://lab.algoproof.fr'), f.slug).toBe(true)
      }
    }
  })
})
