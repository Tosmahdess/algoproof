// tests/app/drawdown-is-loss.test.tsx
//
// Pre-launch audit 2026-09-09, design review §2.1: the DRAWDOWN column was red
// whatever the value, « 0.0% » included (Funding, Grid). A red that never
// varies carries no information, and on a zero it says « danger » where the
// figure says « nothing happened ».
//
// The rule these tests state: a drawdown is painted as a loss only when the
// figure the reader sees is not zero, on every surface that colours it (home
// table, fleet table, fiche metrics, embed, social card). And no surface
// formats the figure by hand, so the colour and the text cannot disagree.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import { mkBot } from '../fixtures/bots'

const { composed } = vi.hoisted(() => ({ composed: [] as unknown[] }))

// Both live (lot 3): the home shows its real-money bots, and their DD, in the first screen.
const ZERO = mkBot({ slug: 'zero-dd', name: 'Zero DD Bot', family: 'carry', status: 'live',
  stats: { win_rate: 0.9, profit_factor: 5, max_drawdown: 0, total_trades: 40, latest_capital: 1050 } })
const REAL = mkBot({ slug: 'real-dd', name: 'Real DD Bot', status: 'live',
  stats: { win_rate: 0.45, profit_factor: 1.2, max_drawdown: 0.084, total_trades: 80, latest_capital: 1020 } })
const FLEET = [ZERO, REAL]

vi.mock('@/lib/queries', () => ({
  getAllBotsWithStats: async () => FLEET,
  getBotWithStats: async (slug: string) => FLEET.find(b => b.slug === slug) ?? null,
  getBotSlugs: async () => FLEET.map(b => b.slug),
}))
vi.mock('@/lib/funnel', () => ({ getFunnelCounts: async () => null }))
vi.mock('@/lib/mi-fleet-impact', () => ({
  pct: (f: number) => `${(f * 100).toFixed(1).replace('.', ',')} %`,
  getFleetImpact: async () => null,
}))
vi.mock('@/lib/articles', () => ({ getArticles: () => [] }))
vi.mock('next/og', () => ({
  ImageResponse: class {
    constructor(element: unknown) { composed.push(element) }
  },
}))

import { drawdownIsLoss, fmtDrawdown } from '@/lib/display'
import HomePage from '@/app/page'
import BotTable from '@/components/BotTable'
import MetricsRow from '@/components/MetricsRow'
import EmbedPage from '@/app/(embed)/embed/[slug]/page'
import { GET as cardGET } from '@/app/api/card/[slug]/route'

describe('drawdownIsLoss reads the figure the reader sees', () => {
  it('a zero drawdown is not a loss', () => {
    expect(fmtDrawdown(0)).toBe('0,0 %')
    expect(drawdownIsLoss(0)).toBe(false)
  })

  it('a drawdown that rounds to « 0.0% » is not painted as a loss either', () => {
    expect(fmtDrawdown(0.0004)).toBe('0,0 %')
    expect(drawdownIsLoss(0.0004)).toBe(false)
  })

  it('any drawdown the reader can see is a loss', () => {
    expect(fmtDrawdown(0.084)).toBe('8,4 %')
    expect(drawdownIsLoss(0.084)).toBe(true)
    expect(drawdownIsLoss(0.001)).toBe(true)
  })
})

describe('no surface paints « 0.0% » red', () => {
  it('home page, real-money cards', async () => {
    render(await HomePage())
    expect(screen.getByText(/0,0 %/)).not.toHaveClass('text-negative')
    expect(screen.getByText(/8,4 %/)).toHaveClass('text-negative')
  })

  it('fleet table (BotTable)', () => {
    render(<BotTable bots={FLEET} showTf={false} />)
    // Lot 4: the phone row carries the figure too (« DD 8,4 % »), so every
    // element that prints it is checked, not the first one found.
    for (const el of screen.getAllByText(/0,0 %/)) expect(el).not.toHaveClass('text-negative')
    for (const el of screen.getAllByText(/8,4 %/)) expect(el).toHaveClass('text-negative')
  })

  it('bot fiche metrics (MetricsRow)', () => {
    const { unmount } = render(<MetricsRow stats={ZERO.stats} family="carry" />)
    expect(screen.getByText(/0,0 %/)).not.toHaveClass('text-negative')
    unmount()
    render(<MetricsRow stats={REAL.stats} family="trend" />)
    expect(screen.getByText(/8,4 %/)).toHaveClass('text-negative')
  })

  it('embed', async () => {
    const { unmount } = render(await EmbedPage({ params: Promise.resolve({ slug: 'zero-dd' }) }))
    expect(screen.getByText(/0,0 %/)).not.toHaveStyle({ color: '#ff4444' })
    unmount()
    render(await EmbedPage({ params: Promise.resolve({ slug: 'real-dd' }) }))
    expect(screen.getByText(/8,4 %/)).toHaveStyle({ color: '#ff4444' })
  })

  it('social card', async () => {
    type El = { props?: { children?: unknown; style?: { color?: string } } }
    const find = (node: unknown, text: string): El | null => {
      if (Array.isArray(node)) {
        for (const n of node) { const hit = find(n, text); if (hit) return hit }
        return null
      }
      if (node && typeof node === 'object' && 'props' in node) {
        const el = node as El
        if (el.props?.children === text) return el
        return find(el.props?.children, text)
      }
      return null
    }
    const req = new Request('https://algoproof.fr/api/card/x')
    await cardGET(req, { params: Promise.resolve({ slug: 'zero-dd' }) })
    await cardGET(req, { params: Promise.resolve({ slug: 'real-dd' }) })
    expect(composed).toHaveLength(2)
    const zero = find(composed[0], '0,0 %')
    const real = find(composed[1], '8,4 %')
    expect(zero, 'the zero drawdown must be on the card').toBeTruthy()
    expect(real, 'the real drawdown must be on the card').toBeTruthy()
    expect(zero!.props!.style!.color).not.toBe('#ff4444')
    expect(real!.props!.style!.color).toBe('#ff4444')
  })
})

describe('the drawdown figure has one formatter', () => {
  it('no file in src/ formats max_drawdown by hand (display.ts owns it)', () => {
    const SRC = path.resolve(__dirname, '../../src')
    const walk = (dir: string, out: string[] = []): string[] => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name)
        if (e.isDirectory()) walk(full, out)
        else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(full)
      }
      return out
    }
    const files = walk(SRC)
    expect(files.length).toBeGreaterThan(50) // the sweep reads the tree, not nothing
    const offenders = files
      .filter(f => !f.endsWith(path.join('lib', 'display.ts')))
      .filter(f => /max_drawdown\s*\*\s*100\)\.toFixed/.test(fs.readFileSync(f, 'utf8')))
      .map(f => path.relative(SRC, f).replace(/\\/g, '/'))
    expect(offenders).toEqual([])
  })
})
