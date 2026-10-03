// tests/app/og-fonts.test.tsx
//
// The three images Satori draws (the share card /api/card/<slug>, a bot's social
// image, the site's social image) were set in ImageResponse's default face, which
// drew the spaces between words at uneven widths (« Croisement  EMA »). They now
// carry the site's face, Schibsted Grotesk, as static TTFs read from
// src/app/fonts/ (scripts/fonts/build_schibsted.py).
//
// ImageResponse is mocked (as in tests/app/share-images.test.tsx) to capture both
// the composed tree and the options, so the real font files are read from disk and
// checked without a render or the network.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactElement } from 'react'
import { prodBot } from '../fixtures/bots'

const captured = vi.hoisted(() => ({
  element: null as ReactElement | null,
  options: null as { fonts?: { name: string; data: ArrayBuffer; weight: number; style: string }[] } | null,
}))
vi.mock('next/og', () => ({
  ImageResponse: class {
    constructor(element: ReactElement, options: typeof captured.options) {
      captured.element = element
      captured.options = options
    }
  },
}))

const BOT = prodBot('v1-spot', { name: 'Croisement EMA H4 Kraken Spot', status: 'live' })
vi.mock('@/lib/queries', () => ({
  getBotWithStats: async (slug: string) => (slug === 'v1-spot' ? BOT : null),
}))
vi.mock('@/lib/bot-simulation', () => ({
  getBotSimulation: async () => null,
  simulationPerfDaily: () => [],
}))
vi.mock('@/lib/funnel', () => ({
  getFunnelCounts: async () => ({ n_swept: 1, n_judged: 1, n_go: 1, n_marginal: 0, n_no_go: 0, n_promoted: 215, n_live: 3 }),
}))

import { GET as cardGET } from '@/app/api/card/[slug]/route'
import BotImage from '@/app/strategies/bot/[slug]/opengraph-image'
import SiteImage from '@/app/opengraph-image'
import { OG_FONT_FAMILY } from '@/lib/og-fonts'

const params = (slug: string) => ({ params: Promise.resolve({ slug }) })
const ROUTES: [string, () => Promise<unknown>][] = [
  ['the site image', () => SiteImage()],
  ['a bot image', () => BotImage(params('v1-spot'))],
  ['the bot image fallback', () => BotImage(params('n-existe-pas'))],
  ['the share card', () => cardGET(new Request('https://algoproof.fr/api/card/v1-spot'), params('v1-spot'))],
]

type El = { props?: { style?: Record<string, unknown>; children?: unknown } }
function families(node: unknown, out: unknown[] = []): unknown[] {
  if (Array.isArray(node)) { for (const n of node) families(n, out); return out }
  if (node && typeof node === 'object' && 'props' in node) {
    const el = node as El
    if (el.props?.style && 'fontFamily' in el.props.style) out.push(el.props.style.fontFamily)
    families(el.props?.children, out)
  }
  return out
}

/** The feature tags of a font's GSUB or GPOS table, read from the sfnt directory. */
function featureTags(data: ArrayBuffer, table: 'GSUB' | 'GPOS'): string[] {
  const v = new DataView(data)
  const tag = (at: number) => String.fromCharCode(v.getUint8(at), v.getUint8(at + 1), v.getUint8(at + 2), v.getUint8(at + 3))
  for (let i = 0; i < v.getUint16(4); i++) {
    const rec = 12 + i * 16
    if (tag(rec) !== table) continue
    const start = v.getUint32(rec + 8)
    const list = start + v.getUint16(start + 6)
    return Array.from({ length: v.getUint16(list) }, (_, j) => tag(list + 2 + j * 6))
  }
  return []
}

describe('the images Satori draws carry Schibsted Grotesk', () => {
  beforeEach(() => {
    captured.element = null
    captured.options = null
  })

  it.each(ROUTES)('%s declares the four weights, read as TrueType from disk', async (_name, draw) => {
    await draw()
    const fonts = captured.options?.fonts ?? []
    expect(fonts.map(f => [f.name, f.weight, f.style])).toEqual(
      [400, 500, 600, 700].map(w => ['Schibsted Grotesk', w, 'normal']),
    )
    for (const f of fonts) {
      // A TrueType font (Satori takes TTF, OTF or WOFF, never WOFF2): sfnt version 1.0.
      expect(new DataView(f.data).getUint32(0)).toBe(0x00010000)
      expect(f.data.byteLength).toBeGreaterThan(20_000)
    }
  })

  // Satori measures each character on its own but draws a word whole, kerned and with
  // its ligatures: the kerning a word loses widened the space after it (« +27,3  % »).
  it('the fonts carry no kerning nor ligature, so a word is drawn as wide as measured', async () => {
    await SiteImage()
    for (const f of captured.options?.fonts ?? []) {
      expect(featureTags(f.data, 'GPOS')).not.toContain('kern')
      expect(featureTags(f.data, 'GSUB')).not.toContain('liga')
      expect(featureTags(f.data, 'GSUB')).not.toContain('rlig')
    }
  })

  it.each(ROUTES)('%s sets the face on its root and nowhere names another', async (_name, draw) => {
    await draw()
    expect(captured.element?.props).toHaveProperty('style.fontFamily', OG_FONT_FAMILY)
    expect(new Set(families(captured.element))).toEqual(new Set([OG_FONT_FAMILY]))
  })
})
