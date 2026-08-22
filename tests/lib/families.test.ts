import { describe, it, expect } from 'vitest'
import { FAMILY_ORDER, isFamily, familyLabel, familyColor } from '@/lib/families'

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

  // FIX (final review, C1 follow-on): /strategies and the home page each held a
  // five-entry colour map with a grey `#888` fallback, so four of the nine
  // families were painted as "unknown". The colour is part of the taxonomy now.
  //
  // UPDATED (design-token pass, 2026-08-22): family colours are now either a
  // literal hex or a `var(--token)` reference into the design system (see
  // families.ts COLORS) — both are valid, resolvable CSS colours. The format
  // check accepts either shape; the distinctness check is unchanged and is
  // still the point of this test.
  it('gives every family a distinct colour', () => {
    const colors = FAMILY_ORDER.map(familyColor)
    for (const c of colors) expect(c).toMatch(/^#[0-9a-f]{6}$|^var\(--[a-z]+\)$/)
    expect(new Set(colors).size).toBe(colors.length)
  })

  // FIX (final whole-branch review, I5): `Family` is a compile-time type and
  // `bots.family` is a runtime string. A family the DB carries but this file
  // does not know used to return `undefined`, which React renders as an empty,
  // colourless badge — silently, on the home page. An unmapped family must
  // fail as loudly as an unmapped column does everywhere else on this branch.
  it('throws on a family it does not know, naming the offending string', () => {
    // Cast: the whole point is a value the type system says cannot arrive and
    // the database can nonetheless produce.
    expect(() => familyLabel('scalping' as never)).toThrow(/scalping/)
    expect(() => familyColor('scalping' as never)).toThrow(/scalping/)
  })

  it('never returns undefined for any input, mapped or not', () => {
    for (const f of FAMILY_ORDER) {
      expect(familyLabel(f)).toBeDefined()
      expect(familyColor(f)).toBeDefined()
    }
    for (const bad of ['', 'grid', 'Trend']) {
      expect(() => familyLabel(bad as never)).toThrow()
      expect(() => familyColor(bad as never)).toThrow()
    }
  })
})
