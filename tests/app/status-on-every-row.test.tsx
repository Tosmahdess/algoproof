// tests/app/status-on-every-row.test.tsx
//
// Pre-launch audit 2026-09-09, P1 #1/#2 (design review §3): on the home page
// at 390 px the top-10 list showed ten coloured P&L figures without a word of
// regime — the one real-money bot was just the red line — while the FAQ said
// « Le statut est toujours affiché ». Desktop had a STATUT column, last, after
// the figure, and two vocabularies for one regime (« Live » in the table,
// « argent réel » in the hero and the balance sheet).
//
// The rule these tests state: every fleet row that shows a P&L carries the
// regime, as a glyph plus a word, BEFORE the figure, in the vocabulary of the
// site's own balance sheet (« Argent réel » / « Simulation »). And the
// real-money badge does not borrow the green that means « gain » on the same
// row.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { mkBot } from '../fixtures/bots'

const FLEET = [
  mkBot({ slug: 'real', name: 'Real Bot', status: 'live', live_since: '2026-04-17T00:00:00Z',
    stats: { win_rate: 0.4, profit_factor: 0.9, max_drawdown: 0.12, total_trades: 80, latest_capital: 916 } }),
  mkBot({ slug: 'sim', name: 'Sim Bot', status: 'paper',
    stats: { win_rate: 0.5, profit_factor: 1.4, max_drawdown: 0.05, total_trades: 60, latest_capital: 1120 } }),
  mkBot({ slug: 'dormant', name: 'Dormant Bot', status: 'paper',
    stats: { win_rate: 0, profit_factor: 0, max_drawdown: 0, total_trades: 0, latest_capital: 1000 } }),
]

vi.mock('@/lib/queries', () => ({ getAllBotsWithStats: async () => FLEET }))
vi.mock('@/lib/funnel', () => ({ getFunnelCounts: async () => null }))
vi.mock('@/lib/mi-fleet-impact', () => ({
  pct: (f: number) => `${(f * 100).toFixed(1).replace('.', ',')} %`,
  getFleetImpact: async () => null,
}))
vi.mock('@/lib/articles', () => ({ getArticles: () => [] }))
vi.mock('@/lib/library', () => ({ getLibraryIdeas: async () => [] }))

import HomePage from '@/app/page'
import BotTable from '@/components/BotTable'
import StatusBadge from '@/components/StatusBadge'

const STATUS_WORD = /Argent réel|Simulation/
const EURO = /€/

/** The rows of the mobile list (`md:hidden` container), one <a> per bot. */
function mobileRows(container: HTMLElement): HTMLAnchorElement[] {
  const lists = [...container.querySelectorAll('[class~="md:hidden"], .bot-table-mobile')]
  const rows = lists.flatMap(l => [...l.querySelectorAll<HTMLAnchorElement>('a[href^="/strategies/bot/"]')])
  // guard against a vacuous pass: the fleet above must actually be listed
  expect(rows.length).toBe(FLEET.length)
  return rows
}

function expectStatusBeforeFigure(rows: HTMLAnchorElement[]) {
  for (const row of rows) {
    const text = row.textContent ?? ''
    const status = text.search(STATUS_WORD)
    expect(status, `no status on row « ${text} »`).toBeGreaterThanOrEqual(0)
    const euro = text.search(EURO)
    if (euro >= 0) {
      expect(status, `status after the figure on row « ${text} »`).toBeLessThan(euro)
    }
  }
}

describe('every fleet row carries its regime before the figure, on mobile too', () => {
  // Lot 3: the home lists the real-money bots only. Refonte registre, lot 2
  // (02/10/2026): they sit in one register titled « Mes bots en argent réel », on
  // a phone as on a computer, without a badge per row (the mock-up). The regime is
  // still read before any figure: the register holds real money only, and its
  // title names it above the first row.
  it('home page, real-money register: real money only, named before the first figure', async () => {
    const { container } = render(await HomePage())
    const register = container.querySelector('[data-testid="home-real"]')!
    const rows = [...register.querySelectorAll('[data-testid="home-real-row"]')]
    expect(rows.length).toBe(FLEET.filter(b => b.status === 'live').length)
    const links = rows.map(r => r.querySelector('a[href^="/strategies/bot/"]')!.getAttribute('href'))
    expect(links).toEqual(['/strategies/bot/real'])
    const text = register.textContent ?? ''
    expect(text.search(/argent réel/i), 'the title names the regime').toBeGreaterThanOrEqual(0)
    expect(text.search(/argent réel/i)).toBeLessThan(text.search(EURO))
  })

  it('BotTable, mobile list (overview, concept pages)', () => {
    const { container } = render(<BotTable bots={FLEET} showTf={false} />)
    expectStatusBeforeFigure(mobileRows(container))
  })

  it('a bot with no trade still shows its regime (« toujours affiché »)', () => {
    const { container } = render(<BotTable bots={FLEET} showTf={false} />)
    const dormant = mobileRows(container).find(r => r.getAttribute('href') === '/strategies/bot/dormant')!
    expect(dormant.textContent).toMatch(STATUS_WORD)
    expect(dormant.textContent).not.toMatch(EURO)
  })
})

describe('the regime is a form and a word, not the colour of the sign', () => {
  // 2026-10-03: the glyphs ● ○ became drawn marks (tests/components/drawn-icons.test.tsx).
  // The rule holds: each regime has its own word, its own mark and its own border,
  // so it never rests on a colour.
  it('uses the balance-sheet vocabulary, one drawn mark and one border each', () => {
    render(<StatusBadge status="live" />)
    render(<StatusBadge status="paper" />)
    const live = screen.getByText(/Argent réel/)
    const sim = screen.getByText(/Simulation/)
    expect(live.querySelector('svg circle')!.getAttribute('fill')).toBe('currentColor')
    expect(sim.querySelector('svg circle')!.getAttribute('fill')).toBe('none')
    expect(sim.className).toContain('border-dashed')
    expect(live.className).not.toContain('border-dashed')
  })

  it('the real-money badge does not wear the gain colour', () => {
    const { container } = render(<StatusBadge status="live" />)
    const html = container.innerHTML
    expect(html).not.toMatch(/text-positive|bg-positive/)
  })

  it('the simulation badge does not wear the warning colour', () => {
    const { container } = render(<StatusBadge status="paper" />)
    expect(container.innerHTML).not.toMatch(/text-warning|bg-warning/)
  })
})
