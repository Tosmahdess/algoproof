// tests/app/share-images.test.tsx
//
// The three images the site hands to other sites (the share card /api/card/<slug>,
// a bot's social image, the site's social image) were still in GitHub's dark palette
// after the « registre des décisions » redesign: a near-black blue background, a
// grey-blue note, a gain in GitHub's ink and a loss in its red, the regime as the
// glyphs ● ○, labels in tracked capitals, and a card signed « données vérifiées »
// although no third party verifies anything (finitions, 2026-10-03).
//
// The rules, read from the composed tree (ImageResponse is mocked, as in
// tests/app/bot-opengraph-image.test.tsx):
// - the DESIGN.md tokens, none of the GitHub ones; a gain in ink, a loss in the loss red;
// - the regime drawn (inline SVG) beside its word, never a glyph;
// - « publié sur algoproof.fr », never « vérifié »; no author name;
// - one string per text element, with ordinary spaces: Satori lays each child out as
//   its own run and drew the no-break spaces of the site's figures irregularly;
// - French figures: « +27,3 % », a comma.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement, ReactNode } from 'react'
import { prodBot } from '../fixtures/bots'
import tailwindConfig from '../../tailwind.config'

const captured = vi.hoisted(() => ({ element: null as ReactElement | null }))
vi.mock('next/og', () => ({
  ImageResponse: class {
    constructor(element: ReactElement) {
      captured.element = element
    }
  },
}))

const db = vi.hoisted(() => ({ bots: {} as Record<string, unknown> }))
vi.mock('@/lib/queries', () => ({
  getBotWithStats: async (slug: string) => db.bots[slug] ?? null,
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

const T = (tailwindConfig.theme?.extend?.colors ?? {}) as Record<string, string>
const GITHUB = ['#0d1117', '#21262d', '#30363d', '#8b949e', '#e6edf3', '#3fb950', '#ff4444', '#f5f5f5', '#ffffff']
const GLYPHS = /[●○◌]/

const LIVE = prodBot('v1-spot', {
  name: 'Croisement EMA H4 Kraken Spot', status: 'live', exchange: 'Kraken Spot', timeframe: 'H4',
  live_since: '2026-04-17T08:00:00Z',
  stats: { total_trades: 42, win_rate: 0.595, profit_factor: 2.82, max_drawdown: 0.022, latest_capital: 1273 },
  perf_daily: [
    { id: '1', bot_id: 'v1-spot', date: '2026-04-17', capital: 1000, pnl_day: 0, win_rate: null, profit_factor: null },
    { id: '2', bot_id: 'v1-spot', date: '2026-05-17', capital: 1273, pnl_day: 0, win_rate: null, profit_factor: null },
  ],
})
const LOSS = prodBot('orb-bf25', {
  name: 'Cassure de range H1', status: 'paper', exchange: 'Hyperliquid', timeframe: 'H1',
  stats: { total_trades: 30, win_rate: 0.3, profit_factor: 0.6, max_drawdown: 0.1, latest_capital: 900 },
})

const ask = (slug: string) => cardGET(new Request(`https://algoproof.fr/api/card/${slug}`), { params: Promise.resolve({ slug }) })
const html = () => renderToStaticMarkup(captured.element!)

type El = { type?: unknown; props?: { children?: ReactNode; style?: Record<string, unknown> } }
/** Every element of the composed tree. */
function elements(node: unknown, out: El[] = []): El[] {
  if (Array.isArray(node)) { for (const n of node) elements(n, out); return out }
  if (node && typeof node === 'object' && 'props' in node) {
    const el = node as El
    // A component (the regime badge, the wordmark) is expanded to what it draws.
    if (typeof el.type === 'function') return elements((el.type as (p: unknown) => unknown)(el.props), out)
    out.push(el)
    elements(el.props?.children, out)
  }
  return out
}
const textOf = (el: El) => {
  const c = el.props?.children
  return typeof c === 'string' || typeof c === 'number' ? String(c) : null
}
function colourOf(text: RegExp): string {
  const el = elements(captured.element).find(e => text.test(textOf(e) ?? ''))
  expect(el, `no element reads ${text}`).toBeTruthy()
  return String(el!.props!.style?.color ?? '').toLowerCase()
}

const IMAGES: Array<[string, () => Promise<unknown>]> = [
  ['share card, real money', () => ask('v1-spot')],
  ['share card, simulation at a loss', () => ask('orb-bf25')],
  ['bot image, real money', () => BotImage({ params: Promise.resolve({ slug: 'v1-spot' }) })],
  ['bot image, simulation at a loss', () => BotImage({ params: Promise.resolve({ slug: 'orb-bf25' }) })],
  ['bot image, unknown bot', () => BotImage({ params: Promise.resolve({ slug: 'n-existe-pas' }) })],
  ['site image', () => SiteImage()],
]

beforeEach(() => {
  captured.element = null
  db.bots = { 'v1-spot': LIVE, 'orb-bf25': LOSS }
})

describe('share images in the site system', () => {
  it.each(IMAGES)('%s: the DESIGN.md palette, none of GitHub\'s', async (_name, draw) => {
    await draw()
    const h = html().toLowerCase()
    expect(h).toContain(T.bg.toLowerCase())
    for (const hex of GITHUB) expect(h, hex).not.toContain(hex)
  })

  it.each(IMAGES)('%s: one string per text element, ordinary spaces, no tracked capitals', async (_name, draw) => {
    await draw()
    for (const el of elements(captured.element)) {
      const kids = el.props?.children
      if (Array.isArray(kids)) {
        const texts = kids.filter(k => typeof k === 'string' || typeof k === 'number')
        expect(texts, `split text: ${JSON.stringify(kids)}`).toHaveLength(0)
      }
      const t = textOf(el)
      if (t) expect(t, t).not.toMatch(/\u202f|\d\u00a0\d/)
      expect(el.props?.style?.textTransform).toBeUndefined()
      expect(el.props?.style?.letterSpacing).toBeUndefined()
    }
  })

  it.each(IMAGES)('%s: no glyph for an icon, no author name, no verifier', async (_name, draw) => {
    await draw()
    expect(html()).not.toMatch(GLYPHS)
    expect(html()).not.toMatch(/Thomas|Dessombs/)
    expect(html()).not.toMatch(/vérifi/i)
  })
})

describe('the share card', () => {
  it('writes a gain in ink and a loss in the loss colour', async () => {
    await ask('v1-spot')
    expect(colourOf(/^\+273,00 €$/)).toBe(T.foreground.toLowerCase())
    expect(colourOf(/^2,82$/)).toBe(T.foreground.toLowerCase())
    await ask('orb-bf25')
    expect(colourOf(/^−100,00 €$/)).toBe(T.negative.toLowerCase())
    expect(colourOf(/^0,60$/)).toBe(T.negative.toLowerCase())
  })

  it('draws the regime beside its word', async () => {
    await ask('v1-spot')
    const svg = elements(captured.element).find(e => e.type === 'svg')
    expect(svg).toBeTruthy()
    expect(html()).toContain('Argent réel')
    await ask('orb-bf25')
    expect(html()).toContain('Simulation')
  })

  it('dates its result and names its base, like the embed', async () => {
    await ask('v1-spot')
    expect(html()).toContain('depuis le 17 avril 2026, base 1 000 €')
  })

  it('says it is published on the site', async () => {
    await ask('v1-spot')
    expect(html()).toContain('Publié sur algoproof.fr')
  })
})

describe('a bot\'s social image', () => {
  it('writes its result as a French percentage, in ink when it is a gain', async () => {
    await BotImage({ params: Promise.resolve({ slug: 'v1-spot' }) })
    expect(colourOf(/^\+27,3 %$/)).toBe(T.foreground.toLowerCase())
    await BotImage({ params: Promise.resolve({ slug: 'orb-bf25' }) })
    expect(colourOf(/^−10,0 %$/)).toBe(T.negative.toLowerCase())
  })

  it('draws the regime beside its word, and keeps the wordmark green on « Proof » only', async () => {
    await BotImage({ params: Promise.resolve({ slug: 'v1-spot' }) })
    expect(elements(captured.element).some(e => e.type === 'svg' && renderToStaticMarkup(e as ReactElement).includes('<circle'))).toBe(true)
    const greens = elements(captured.element).filter(e => String(e.props?.style?.color ?? '').toLowerCase() === T.brand.toLowerCase())
    expect(greens.map(textOf)).toEqual(['Proof'])
  })
})

describe('a no-break space the name asked for', () => {
  it('keeps « n° 2 » together, while the figures take ordinary spaces', async () => {
    db.bots['orb-bf25'] = { ...LOSS, name: 'Croisement KAMA H4 n°\u00a02' }
    await BotImage({ params: Promise.resolve({ slug: 'orb-bf25' }) })
    expect(html()).toContain('Croisement KAMA H4 n°\u00a02')
  })
})
