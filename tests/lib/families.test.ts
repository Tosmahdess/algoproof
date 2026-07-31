import { describe, it, expect } from 'vitest'
import { FAMILY_ORDER, isFamily, familyLabel } from '@/lib/families'

describe('family taxonomy', () => {
  it('holds exactly the nine canonical families, in display order', () => {
    expect([...FAMILY_ORDER]).toEqual([
      'trend',
      'momentum',
      'breakout',
      'mean-reversion',
      'price-action',
      'carry',
      'market-neutral',
      'stat-arb',
      'event',
    ])
  })

  it('accepts every canonical slug', () => {
    for (const f of FAMILY_ORDER) expect(isFamily(f)).toBe(true)
  })

  it('rejects slugs that are not canonical', () => {
    // 'momentum' and 'price-action' ARE canonical since the taxonomy went to
    // nine; the negative case must use a slug that is genuinely outside it.
    expect(isFamily('scalping')).toBe(false)
    expect(isFamily('grid')).toBe(false)
    expect(isFamily('')).toBe(false)
    expect(isFamily(null)).toBe(false)
    expect(isFamily(undefined)).toBe(false)
    expect(isFamily(7)).toBe(false)
  })

  it('gives every family a non-empty French label', () => {
    for (const f of FAMILY_ORDER) {
      expect(familyLabel(f).length).toBeGreaterThan(0)
    }
  })

  it('gives distinct labels, so two families never read the same in a filter', () => {
    const labels = FAMILY_ORDER.map(familyLabel)
    expect(new Set(labels).size).toBe(labels.length)
  })
})
