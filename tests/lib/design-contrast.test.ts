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

  it('muted text at 80 % or less does NOT clear 4,5:1 — the reason the sweep below exists', () => {
    expect(contrast(colors.muted, colors.bg, 0.8)).toBeLessThan(4.5)
    expect(contrast(colors.muted, colors.bg, 0.5)).toBeLessThan(4.5)
  })

  it('the paid CTA — dark text (bg token) on the accent — clears 4,5:1', () => {
    expect(contrast(colors.bg, colors.accent)).toBeGreaterThanOrEqual(4.5)
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
