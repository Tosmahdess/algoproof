// tests/app/bot-opengraph-image.test.tsx
//
// The share image of every bot fiche was the bare « AlgoProof » fallback:
// Next 16 hands `params` to an opengraph-image as a Promise, and the route read
// `params.slug` without awaiting it, so getBotWithStats(undefined) found no bot
// (audit 2026-10, n° 5: v1-spot, kamacross and orb-bf25 all served the same
// 23 014-byte image). These tests pass the Promise exactly as Next does.
//
// ImageResponse is mocked to capture the JSX tree instead of rasterizing it,
// as in tests/app/opengraph-image.test.tsx.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'
import { prodBot } from '../fixtures/bots'

const captured = vi.hoisted(() => ({ element: null as ReactElement | null }))
vi.mock('next/og', () => ({
  ImageResponse: class {
    constructor(element: ReactElement) {
      captured.element = element
    }
  },
}))

const BOT = prodBot('v1-spot', { name: 'EMA Cross H4 Kraken Spot', status: 'live' })
const PAPER = prodBot('orb-bf25', { name: 'ORB H1 HL', status: 'paper' })
const asked = vi.hoisted(() => ({ slugs: [] as unknown[] }))
vi.mock('@/lib/queries', () => ({
  getBotWithStats: async (slug: unknown) => {
    asked.slugs.push(slug)
    return slug === 'v1-spot' ? BOT : slug === 'orb-bf25' ? PAPER : null
  },
}))
vi.mock('@/lib/bot-simulation', () => ({
  getBotSimulation: async () => null,
  simulationPerfDaily: () => [],
}))

import Image from '@/app/strategies/bot/[slug]/opengraph-image'

describe('/strategies/bot/[slug]/opengraph-image', () => {
  beforeEach(() => {
    captured.element = null
    asked.slugs = []
  })

  it('looks the bot up by the slug Next resolves, not undefined', async () => {
    await Image({ params: Promise.resolve({ slug: 'v1-spot' }) })
    expect(asked.slugs).toEqual(['v1-spot'])
  })

  it('draws a known bot, not the fallback', async () => {
    await Image({ params: Promise.resolve({ slug: 'v1-spot' }) })
    const html = renderToStaticMarkup(captured.element!)
    expect(html).toContain('EMA Cross H4 Kraken Spot')
    expect(html).toContain('Facteur de profit')
  })

  it('still falls back to the logo for an unknown bot', async () => {
    await Image({ params: Promise.resolve({ slug: 'n-existe-pas' }) })
    const html = renderToStaticMarkup(captured.element!)
    expect(html).not.toContain('Facteur de profit')
    expect(html).toContain('Proof')
  })

  // Once the image stopped being the fallback, its hardcoded « Paper Trading »
  // badge showed on v1-spot, a real-money bot. The regime now reads like the
  // site's StatusBadge and the embed.
  it('labels a real-money bot « Argent réel » and a paper bot « Simulation »', async () => {
    await Image({ params: Promise.resolve({ slug: 'v1-spot' }) })
    const live = renderToStaticMarkup(captured.element!)
    expect(live).toContain('Argent réel')
    expect(live).not.toMatch(/Paper Trading|Simulation/)
    await Image({ params: Promise.resolve({ slug: 'orb-bf25' }) })
    const paper = renderToStaticMarkup(captured.element!)
    expect(paper).toContain('Simulation')
    expect(paper).not.toMatch(/Paper Trading|Argent réel/)
  })
})
