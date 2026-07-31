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

  // One row per fiche — a spot-check on a handful of slugs can stay green
  // through a mis-mapping (e.g. reassigning 'ichimoku' to 'momentum' would
  // not fail a test that only checks 'macd', 'roc', 'tsi', 'ema-cross',
  // 'orb', 'rsi-mean-reversion'). This table is the exact mapping applied in
  // src/lib/strategy-library.ts's port from the lab's free-form labels; any
  // future edit to a fiche's family must edit this table too.
  const EXPECTED_FAMILY: Record<string, string> = {
    'ema-cross': 'trend',
    ichimoku: 'trend',
    'ma-cross': 'trend',
    'kama-cross': 'trend',
    'ema-ribbon': 'trend',
    supertrend: 'trend',
    'heikin-ashi': 'trend',
    'chandelier-exit': 'trend',
    macd: 'momentum',
    roc: 'momentum',
    tsi: 'momentum',
    donchian: 'breakout',
    keltner: 'breakout',
    'atr-channel': 'breakout',
    bollinger: 'breakout',
    'ttm-squeeze': 'breakout',
    orb: 'breakout',
    'rsi-divergence': 'mean-reversion',
    'rsi-mean-reversion': 'mean-reversion',
    stochastic: 'mean-reversion',
    fvg: 'price-action',
    'fvg-multi': 'price-action',
  }

  it('maps every one of the 22 fiches to its agreed family', () => {
    expect(Object.keys(EXPECTED_FAMILY)).toHaveLength(22)
    for (const [slug, family] of Object.entries(EXPECTED_FAMILY)) {
      expect(getStrategyFiche(slug)!.family, slug).toBe(family)
    }
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
