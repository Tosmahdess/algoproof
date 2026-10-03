// tests/components/drawn-icons.test.tsx
//
// Icons are drawn, never typed (finitions of the « registre des décisions »
// redesign, 2026-10-03). The regime badge said « ● Argent réel », « ○ Simulation »,
// « ◌ Backtest », and the favourite controls « ☆ » / « ★ »: Unicode glyphs that each
// OS draws from whatever font it falls back to, at its own size and weight. They
// are now small SVGs, hidden from assistive technology, in the stroke of the
// site's other icons. The words stay: the regime never rests on a colour, nor on
// the mark alone.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatusBadge from '@/components/StatusBadge'
import FavoriteButton from '@/components/FavoriteButton'
import { FavoritesProvider, FavoriteStar } from '@/components/FavoritesProvider'

const getSession = vi.fn()
vi.mock('@/lib/supabase-auth-browser', () => ({
  createSupabaseAuthBrowser: () => ({ auth: { getSession } }),
}))
const fetchMock = vi.fn()
const reply = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }))
beforeEach(() => {
  getSession.mockReset()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

const GLYPHS = /[●○◌☆★]/

describe('StatusBadge draws its regime mark', () => {
  const VARIANTS = ['default', 'registre'] as const

  it.each(VARIANTS)('%s: one hidden SVG mark per regime, the word kept, no glyph', variant => {
    const shapes: Record<string, { fill: string; dash: boolean }> = {
      live: { fill: 'currentColor', dash: false },
      paper: { fill: 'none', dash: false },
      backtest: { fill: 'none', dash: true },
    }
    const words: Record<string, string> = { live: 'Argent réel', paper: 'Simulation', backtest: 'Backtest' }
    for (const [status, shape] of Object.entries(shapes)) {
      const { container, unmount } = render(<StatusBadge status={status as 'live'} variant={variant} />)
      expect(container.textContent).toBe(words[status])
      expect(container.textContent).not.toMatch(GLYPHS)
      const svg = container.querySelector('svg')!
      expect(svg, status).toBeTruthy()
      expect(svg.getAttribute('aria-hidden')).toBe('true')
      const circle = svg.querySelector('circle')!
      expect(circle.getAttribute('fill')).toBe(shape.fill)
      expect(circle.hasAttribute('stroke-dasharray')).toBe(shape.dash)
      unmount()
    }
  })

  it('three regimes, three different marks: full, hollow, dotted', () => {
    const sig = (status: 'live' | 'paper' | 'backtest') => {
      const { container, unmount } = render(<StatusBadge status={status} />)
      const c = container.querySelector('circle')!
      const s = `${c.getAttribute('fill')}|${c.getAttribute('stroke-dasharray') ?? ''}`
      unmount()
      return s
    }
    expect(new Set([sig('live'), sig('paper'), sig('backtest')]).size).toBe(3)
  })

  it('a frozen or archived bot has its word and no mark', () => {
    for (const status of ['frozen', 'archived'] as const) {
      const { container, unmount } = render(<StatusBadge status={status} />)
      expect(container.querySelector('svg')).toBeNull()
      expect(container.textContent).toMatch(/Gelé|Archivé/)
      unmount()
    }
  })

  it('the real-money badge does not pulse: a steady mark says « argent réel » as well', () => {
    const { container } = render(<StatusBadge status="live" />)
    expect(container.innerHTML).not.toMatch(/animate-/)
  })
})

describe('the favourite controls draw their star', () => {
  it('FavoriteButton, default appearance, guest: a drawn star, no glyph', async () => {
    getSession.mockResolvedValue({ data: { session: null } })
    render(<FavoriteButton slug="v1-hl" />)
    const link = await screen.findByRole('link', { name: /Garder en favori/ })
    expect(link.textContent).not.toMatch(GLYPHS)
    expect(link.querySelector('svg[aria-hidden="true"]')).toBeTruthy()
  })

  it('FavoriteButton, default appearance: the star fills when the bot is a favourite', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 't' } } })
    fetchMock.mockReturnValueOnce(reply(200, { favorite: true, kind: 'bot', slug: 'v1-hl' }))
    render(<FavoriteButton slug="v1-hl" />)
    const btn = await screen.findByRole('button', { name: /Dans mes favoris/ })
    expect(btn.textContent).not.toMatch(GLYPHS)
    expect(btn.querySelector('svg[aria-hidden="true"]')!.getAttribute('fill')).toBe('currentColor')
  })

  it('FavoriteStar on a list row: a drawn star, filled or not, no glyph', async () => {
    window.history.replaceState({}, '', '/overview')
    getSession.mockResolvedValue({ data: { session: { access_token: 't' } } })
    fetchMock.mockReturnValueOnce(reply(200, { items: [{ slug: 'b1' }], total: 1, next_cursor: null }))
    render(
      <FavoritesProvider kind="bot">
        <FavoriteStar kind="bot" slug="b0" name="Bot 0" />
        <FavoriteStar kind="bot" slug="b1" name="Bot 1" />
      </FavoritesProvider>,
    )
    const on = await screen.findByRole('button', { name: 'Retirer Bot 1 de mes favoris' })
    const off = screen.getByRole('button', { name: 'Garder Bot 0 en favori' })
    for (const b of [on, off]) expect(b.textContent).not.toMatch(GLYPHS)
    expect(on.querySelector('svg[aria-hidden="true"]')!.getAttribute('fill')).toBe('currentColor')
    expect(off.querySelector('svg[aria-hidden="true"]')!.getAttribute('fill')).toBe('none')
  })
})
