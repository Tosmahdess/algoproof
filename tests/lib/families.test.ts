import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { FAMILY_ORDER, isFamily, familyLabel, familyColor } from '@/lib/families'

const ROOT = path.resolve(__dirname, '../..')
const SIGNALS = ['positive', 'negative', 'warning', 'severe'] as const

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

  // 2026-09-11 review (P7): breakout was painted in `positive` (gain green),
  // trend in `severe`, carry in `warning`. A family badge is a category, not a
  // verdict: no family colour may be a signal token, or a signal token's hex.
  it('no family colour is a signal colour, by token or by hex', () => {
    const tw = fs.readFileSync(path.join(ROOT, 'tailwind.config.ts'), 'utf8')
    const css = fs.readFileSync(path.join(ROOT, 'src/app/globals.css'), 'utf8')
    const cssVar = (name: string) =>
      css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1].toLowerCase() ?? null

    const signalHex = new Set<string>()
    for (const s of SIGNALS) {
      const fromConfig = tw.match(new RegExp(`\\b${s}:\\s*'(#[0-9a-fA-F]{6})'`))?.[1].toLowerCase()
      expect(fromConfig, `${s} in tailwind.config.ts`).toBeTruthy()
      signalHex.add(fromConfig!)
      const fromCss = cssVar(s)
      if (fromCss) signalHex.add(fromCss)
    }

    const offenders = FAMILY_ORDER.filter(f => {
      const c = familyColor(f)
      const token = c.match(/^var\(--([a-z-]+)\)$/)?.[1]
      const hex = token ? cssVar(token) : c.toLowerCase()
      return (token !== undefined && (SIGNALS as readonly string[]).includes(token))
        || (hex !== null && signalHex.has(hex))
    })
    expect(offenders).toEqual([])
  })

  // 2026-09-11 reading pass (user decision): the nine colours were chosen for
  // how they read on the two backgrounds a family badge sits on, #0a0a0a (the
  // page) and #111111 (a card). A comment claiming a ratio is a comment; this
  // computes the WCAG 2.x contrast from the hex itself.
  it('draws every family above 4.5:1 on both backgrounds the site paints', () => {
    const channel = (c: number) => {
      const s = c / 255
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    }
    const luminance = (hex: string) => {
      const n = parseInt(hex.slice(1), 16)
      return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
    }
    const contrast = (a: string, b: string) => {
      const [x, y] = [luminance(a), luminance(b)]
      return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
    }
    // The formula, checked against the two ratios WCAG states outright: black
    // on white is 21:1, and #767676 is the darkest grey that clears 4.5:1 on
    // white. Without this, a broken formula could return a large number for
    // everything and every assertion below would pass.
    expect(contrast('#ffffff', '#000000')).toBeCloseTo(21, 5)
    expect(contrast('#767676', '#ffffff')).toBeGreaterThanOrEqual(4.5)
    expect(contrast('#777777', '#ffffff')).toBeLessThan(4.5)

    for (const f of FAMILY_ORDER) {
      const c = familyColor(f)
      // A `var(--token)` cannot be measured here: a family colour must be a
      // literal hex for this guard to mean anything.
      expect(c, `${f} is not a literal hex`).toMatch(/^#[0-9a-f]{6}$/)
      for (const bg of ['#0a0a0a', '#111111']) {
        expect(contrast(c, bg), `${f} on ${bg}`).toBeGreaterThanOrEqual(4.5)
      }
    }
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
