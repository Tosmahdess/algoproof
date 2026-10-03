// tests/lib/design-contrast.test.ts
//
// Pre-launch audit 2026-09-09, production measurements (§1): the least
// readable text on the site was the footer's « Ceci n'est pas un conseil
// financier » at 2,20:1 (text-muted/50), then « Dernier calcul le … » and the
// fiche dates at 3,2:1 (text-muted/70), then the paid CTA at 2,74:1
// (`text-background`, a class the config never declared, so the button
// inherited near-white on the indigo accent).
//
// Two rules, computed from the tokens rather than asserted from memory:
//
// 1. `muted` (#888888) on the darkest ground clears 4,5:1 — but only at full
//    opacity. Composited at 80 % over #0a0a0a it lands at 3,9:1, at 70 % at
//    3,3:1, at 50 % at 2,2:1. So an opacity modifier on muted TEXT is, by
//    arithmetic, a WCAG failure whatever the element; this test sweeps src/
//    for it. `/90` (4,65:1) is the only step that still clears the bar.
//
// 2. Every text/ground pair the site uses for body text and for the paid CTA
//    is checked with the real WCAG formula, so a token change that breaks a
//    ratio fails here rather than in a Lighthouse run after deploy.
//
// Refonte « Le registre des décisions », lot 1 (2026-10-02): Astra's palette.
// Muted is #a8b6ab on #101714 now (8,61:1), so muted at 80 % still clears the bar
// (5,9:1) and the old « 80 % fails » assertion no longer held. The rule it
// protected still does: below 70 % muted fails (60 % gives 3,85:1, 50 % 3,09:1),
// and the sweep refuses every step under /90 because prose is foreground or
// muted, nothing in between (design-drift-guard). The assertion now names the
// step that fails with the new values.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import tailwindConfig from '../../tailwind.config'

const colors = (tailwindConfig.theme?.extend?.colors ?? {}) as Record<string, string>

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** WCAG 2.x contrast ratio of `fg` over `bg`, `fg` composited at `alpha`. */
export function contrast(fg: string, bg: string, alpha = 1): number {
  const f = hexToRgb(fg), b = hexToRgb(bg)
  const composited = f.map((c, i) => Math.round(alpha * c + (1 - alpha) * b[i])) as [number, number, number]
  const [l1, l2] = [luminance(composited), luminance(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

describe('design tokens — contrast computed from tailwind.config.ts', () => {
  it('declares the tokens this test relies on', () => {
    for (const t of ['bg', 'card', 'muted', 'accent', 'foreground']) {
      expect(colors[t], `token ${t}`).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('muted text clears 4,5:1 on both grounds at full opacity', () => {
    expect(contrast(colors.muted, colors.bg)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(colors.muted, colors.card)).toBeGreaterThanOrEqual(4.5)
  })

  it('muted text at 60 % or less does NOT clear 4,5:1 — the reason the sweep below exists', () => {
    expect(contrast(colors.muted, colors.bg, 0.6)).toBeLessThan(4.5)
    expect(contrast(colors.muted, colors.bg, 0.5)).toBeLessThan(4.5)
  })

  it('the paid CTA — dark text (bg token) on the accent — clears 4,5:1', () => {
    expect(contrast(colors.bg, colors.accent)).toBeGreaterThanOrEqual(4.5)
  })

  // Lot 1 of the redesign: the primary button is ink on a dark slate fill.
  it('the primary button — ink on the button fill — clears 4,5:1', () => {
    expect(contrast(colors.foreground, colors.button)).toBeGreaterThanOrEqual(4.5)
  })

  // Every text colour the site sets (ink, note, link, loss, reserve) on the three
  // grounds it paints (page, surface, active surface).
  it('every text token clears 4,5:1 on every ground', () => {
    for (const fg of ['foreground', 'muted', 'accent', 'negative', 'warning']) {
      for (const bg of ['bg', 'card', 'card-2']) {
        expect(contrast(colors[fg], colors[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  // A control's edge and the focus ring are non-text (WCAG 1.4.11, 3:1).
  it('the control outline and the focus colour clear 3:1 on the page and the surface', () => {
    for (const bg of ['bg', 'card']) {
      expect(contrast(colors['border-strong'], colors[bg]), `border-strong on ${bg}`).toBeGreaterThanOrEqual(3)
      expect(contrast(colors.accent, colors[bg]), `accent on ${bg}`).toBeGreaterThanOrEqual(3)
    }
  })

  // A gain is ordinary ink (owner, 2026-10-02): green is the brand, not a result.
  it('paints a gain in ink, and keeps green for the wordmark', () => {
    expect(colors.positive.toLowerCase()).toBe(colors.foreground.toLowerCase())
    expect(colors.brand.toLowerCase()).not.toBe(colors.positive.toLowerCase())
  })
})

describe('globals.css mirrors tailwind.config.ts', () => {
  // The CSS variables exist for inline styles (charts, data files); a palette
  // change made in one file only would paint two sites.
  it('declares every colour token as a CSS variable with the same value', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../../src/app/globals.css'), 'utf8')
    const drift: string[] = []
    for (const [name, hex] of Object.entries(colors)) {
      const v = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1]
      if (v?.toLowerCase() !== hex.toLowerCase()) drift.push(`${name}: config ${hex}, css ${v ?? 'absent'}`)
    }
    expect(drift).toEqual([])
  })
})

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (entry.name.endsWith('.tsx')) out.push(full)
  }
  return out
}

describe('no opacity modifier on muted text anywhere in src/', () => {
  it('text-muted/NN with NN < 90 is absent (it cannot clear 4,5:1, see above)', () => {
    const root = path.resolve(__dirname, '../../src')
    const offenders: string[] = []
    for (const file of walk(root)) {
      const src = fs.readFileSync(file, 'utf8')
      for (const m of src.matchAll(/text-muted\/(\d+)/g)) {
        if (Number(m[1]) < 90) {
          const line = src.slice(0, m.index).split('\n').length
          offenders.push(`${path.relative(root, file).replace(/\\/g, '/')}:${line} ${m[0]}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })
})
