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

const db = vi.hoisted(() => ({ bot: null as BotWithStats | null }))
vi.mock('@/lib/queries', () => ({
  getBotWithStats: async (slug: string) => (db.bot && db.bot.slug === slug ? db.bot : null),
  getBotSlugs: async () => (db.bot ? [db.bot.slug] : []),
}))
vi.mock('@/lib/bot-simulation', () => ({ getBotSimulation: async () => null }))

import { GET } from '@/app/embed/[slug]/route'

async function get(slug: string) {
  const res = await GET(new Request(`https://algoproof.fr/embed/${slug}`), { params: Promise.resolve({ slug }) })
  return { res, html: await res.text() }
}

describe('/embed/[slug]', () => {
  beforeEach(() => {
    db.bot = prodBot('v1-spot', {
      name: 'EMA Cross H4 Kraken Spot', status: 'live', exchange: 'Kraken Spot', timeframe: 'H4',
      stats: { total_trades: 13, win_rate: 0.46, profit_factor: 2.0, max_drawdown: 0.05, latest_capital: 1080 },
    })
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
})
