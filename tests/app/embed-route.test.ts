// tests/app/embed-route.test.ts
//
// /embed/<slug> is the card a reader pastes into their own site as an iframe.
// It used to be a page under src/app/(embed), nested inside the site's root
// layout: the served document carried two <html>, two <body>, and the site's
// nav and footer around a 480 px card (audit 2026-10, n° 2). It is now a route
// handler that answers one standalone HTML document, so nothing of the site's
// layout can leak into it.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prodBot } from '../fixtures/bots'
import type { BotWithStats } from '@/lib/types'
import tailwindConfig from '../../tailwind.config'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

type Sim = { stats: BotWithStats['stats']; timeline: { simStart: string; simStartCapital: number } }
const db = vi.hoisted(() => ({ bot: null as BotWithStats | null, sim: null as Sim | null }))
vi.mock('@/lib/queries', () => ({
  getBotWithStats: async (slug: string) => (db.bot && db.bot.slug === slug ? db.bot : null),
  getBotSlugs: async () => (db.bot ? [db.bot.slug] : []),
}))
vi.mock('@/lib/bot-simulation', () => ({ getBotSimulation: async () => db.sim }))

const TOKENS = (tailwindConfig.theme?.extend?.colors ?? {}) as Record<string, string>
const doc = (html: string) => new DOMParser().parseFromString(html, 'text/html')
/** The inline colour of the element whose own text is exactly `text`. */
function colourOf(html: string, text: RegExp): string {
  const el = [...doc(html).querySelectorAll<HTMLElement>('body *')]
    .find(e => e.children.length === 0 && text.test(e.textContent ?? ''))
  expect(el, `no element reads ${text}`).toBeTruthy()
  return (el!.getAttribute('style') ?? '').match(/(?:^|;)\s*color:\s*(#[0-9a-f]{6})/i)?.[1].toLowerCase() ?? ''
}

import { GET } from '@/app/embed/[slug]/route'

async function get(slug: string) {
  const res = await GET(new Request(`https://algoproof.fr/embed/${slug}`), { params: Promise.resolve({ slug }) })
  return { res, html: await res.text() }
}

describe('/embed/[slug]', () => {
  beforeEach(() => {
    db.bot = prodBot('v1-spot', {
      name: 'EMA Cross H4 Kraken Spot', status: 'live', exchange: 'Kraken Spot', timeframe: 'H4',
      live_since: '2026-04-17T08:00:00Z',
      stats: { total_trades: 13, win_rate: 0.46, profit_factor: 2.0, max_drawdown: 0.05, latest_capital: 1080 },
    })
    db.sim = null
  })

  it('answers one standalone HTML document', async () => {
    const { res, html } = await get('v1-spot')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/^text\/html;\s*charset=utf-8$/i)
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
    expect(html.match(/<html[\s>]/g)).toHaveLength(1)
    expect(html.match(/<body[\s>]/g)).toHaveLength(1)
    expect(html.match(/<head[\s>]/g)).toHaveLength(1)
    expect(html).toContain('<html lang="fr">')
  })

  it('carries none of the site layout', async () => {
    const { html } = await get('v1-spot')
    expect(html).not.toMatch(/<nav[\s>]/)
    expect(html).not.toMatch(/<footer[\s>]/)
    expect(html).not.toContain('Aller au contenu')
    expect(html).not.toMatch(/<script[\s>]/)
  })

  it('shows the card: name, venue, regime, the four figures and the link to the fiche', async () => {
    const { html } = await get('v1-spot')
    expect(html).toContain('EMA Cross H4 Kraken Spot')
    expect(html).toContain('Kraken Spot · H4')
    expect(html).toContain('Argent réel')
    for (const label of ['WR', 'PF', 'DD', 'P&amp;L']) expect(html).toContain(`>${label}<`)
    expect(html).toContain('href="https://algoproof.fr/strategies/bot/v1-spot"')
  })

  it('says the card is published on the site, not verified by it', async () => {
    const { html } = await get('v1-spot')
    expect(html).toContain('Publié sur algoproof.fr')
    expect(html).not.toMatch(/Vérifié/i)
  })

  it('sets no text below 12 px', async () => {
    const { html } = await get('v1-spot')
    const sizes = [...html.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map(m => Number(m[1]))
    expect(sizes.length).toBeGreaterThan(0)
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(12)
  })

  it('escapes what comes from the database', async () => {
    db.bot = { ...db.bot!, name: '<img src=x onerror=alert(1)> & co', exchange: '"Kraken"' }
    const { html } = await get('v1-spot')
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt; &amp; co')
    expect(html).toContain('&quot;Kraken&quot;')
  })

  it('answers a standalone 404 for an unknown bot', async () => {
    const { res, html } = await get('n-existe-pas')
    expect(res.status).toBe(404)
    expect(html.match(/<html[\s>]/g)).toHaveLength(1)
    expect(html).not.toMatch(/<nav[\s>]/)
    expect(html).toContain('Bot introuvable')
  })

  // Finitions of the « registre des décisions » redesign (2026-10-03): the card was
  // still in GitHub's dark palette, green on a gain, a monospace for the figures, and
  // a P&L with no date and no base, alone on another site.
  describe('in the site system', () => {
    const GITHUB = ['#0d1117', '#30363d', '#8b949e', '#e6edf3', '#3fb950', '#ff4444']

    it('paints with the site tokens, never the GitHub dark palette', async () => {
      const { html } = await get('v1-spot')
      for (const t of ['bg', 'card', 'border', 'foreground', 'muted']) {
        expect(html.toLowerCase(), `token ${t}`).toContain(TOKENS[t].toLowerCase())
      }
      for (const hex of GITHUB) expect(html.toLowerCase()).not.toContain(hex)
      const notFound = (await get('n-existe-pas')).html.toLowerCase()
      for (const hex of GITHUB) expect(notFound).not.toContain(hex)
    })

    it('writes a gain in ordinary ink and a loss in the loss colour', async () => {
      const gain = (await get('v1-spot')).html
      expect(colourOf(gain, /^\+80,00\s€$/)).toBe(TOKENS.foreground.toLowerCase())
      db.bot = { ...db.bot!, stats: { ...db.bot!.stats, latest_capital: 916, profit_factor: 0.8 } }
      const loss = (await get('v1-spot')).html
      expect(colourOf(loss, /^−84,00\s€$/)).toBe(TOKENS.negative.toLowerCase())
      expect(colourOf(loss, /^0,80$/)).toBe(TOKENS.negative.toLowerCase())
    })

    it('dates a real-money result and names its base, beside the P&L', async () => {
      const { html } = await get('v1-spot')
      expect(html).toMatch(/depuis le 17 avril 2026, base 1\s000\s€/)
    })

    it('reads the base from the bot, never a typed 1 000', async () => {
      db.bot = { ...db.bot!, start_capital: 500, stats: { ...db.bot!.stats, latest_capital: 540 } }
      const { html } = await get('v1-spot')
      expect(html).toMatch(/base 500\s€/)
      expect(html).toMatch(/\+40,00\s€/)
    })

    it('gives a simulation its period and its start', async () => {
      db.bot = { ...db.bot!, status: 'paper', live_since: null, paper_since: '2026-04-08T10:00:00Z' }
      const { html } = await get('v1-spot')
      expect(html).toMatch(/simulation depuis le 8 avril 2026, départ 1\s000\s€/)
      expect(html).not.toMatch(/base 1\s000/)
    })

    it('starts the simulation where the fiche does when the bot has a backtest segment', async () => {
      db.bot = { ...db.bot!, status: 'paper', live_since: null }
      db.sim = {
        stats: { ...db.bot.stats, latest_capital: 1300 },
        timeline: { simStart: '2026-06-01', simStartCapital: 1234.5 },
      }
      const { html } = await get('v1-spot')
      expect(html).toMatch(/simulation depuis le 1er juin 2026, départ 1\s234,50\s€/)
      expect(html).toMatch(/\+65,50\s€/)
    })

    it('carries the site icon, so the browser does not ask for /favicon.ico', async () => {
      const { html } = await get('v1-spot')
      // Relative, so the CSP's img-src 'self' admits it on production, previews and a
      // local server alike; the file is the site's own icon (src/app/icon.svg).
      expect(html).toContain('<link rel="icon" href="/icon.svg" type="image/svg+xml">')
      expect(existsSync(resolve(__dirname, '../../src/app/icon.svg'))).toBe(true)
      expect((await get('n-existe-pas')).html).toContain('rel="icon"')
    })

    it('sets the figures in the system face with tabular figures, never a monospace', async () => {
      const { html } = await get('v1-spot')
      expect(html).not.toMatch(/monospace/i)
      expect(html).toMatch(/font-family:\s*system-ui/)
      expect(html).toContain('font-variant-numeric:tabular-nums')
    })

    it('draws the regime mark instead of a glyph, and keeps the word', async () => {
      const live = (await get('v1-spot')).html
      expect(live).not.toMatch(/[●○◌]/)
      const mark = doc(live).querySelector('svg[aria-hidden="true"]')
      expect(mark).toBeTruthy()
      expect(live).toContain('Argent réel')
      db.bot = { ...db.bot!, status: 'paper' }
      const sim = (await get('v1-spot')).html
      expect(sim).not.toMatch(/[●○◌]/)
      expect(sim).toContain('Simulation')
    })

    it('has one main landmark and the bot name as its heading', async () => {
      const page = doc((await get('v1-spot')).html)
      expect(page.querySelectorAll('main')).toHaveLength(1)
      expect(page.querySelector('main h1')?.textContent).toBe('EMA Cross H4 Kraken Spot')
    })

    it('labels its columns in sentence case, without tracked capitals', async () => {
      const { html } = await get('v1-spot')
      expect(html).not.toMatch(/text-transform:\s*uppercase/)
      expect(html).not.toMatch(/letter-spacing/)
    })
  })
})
