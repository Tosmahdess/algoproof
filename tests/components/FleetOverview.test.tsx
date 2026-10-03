import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import FleetOverview from '@/components/FleetOverview'
import { toSummaryBots } from '../fixtures/list-bots'
import { computeFleetAggregate } from '@/lib/fleet-aggregate'
import { EMPTY_FILTERS } from '@/lib/bot-filters'
import type { TradeWithBot, PerfDaily } from '@/lib/types'
import { FIXTURE_FLEET, mkBot } from '../fixtures/bots'

// Refonte « registre », lot 4 (2026-10-02). The page reads, in order: the two
// totals, the single register, then the folded journal and the folded 30-day
// curves, then the recent trades. The real-money cards are gone (owner: one
// list); the real-money bots are rows of it, with their regime and their rule.
// Gone before: the market-weather banner and the twelve-colour equity chart.
type Curve = { slug: string; name: string; color: string; data: { date: string; capital: number }[] }
const curveProps: { bots: Curve[] }[] = []
vi.mock('@/components/GlobalEquityCurve', () => ({
  default: (props: { bots: Curve[] }) => {
    curveProps.push(props)
    return <div data-testid="equity-curve-stub" />
  },
}))

const RECENT: TradeWithBot[] = [
  { id: 'tr-1', opened_at: '2026-07-30T08:00:00Z', closed_at: '2026-07-30T12:00:00Z',
    asset: 'BTC/USDC', side: 'long', pnl: 12.5, reason: 'take profit',
    bots: { name: 'ORB H1 HL', slug: 'orb-bf25', family: 'breakout', status: 'live' } },
  { id: 'tr-2', opened_at: '2026-07-29T08:00:00Z', closed_at: '2026-07-29T20:00:00Z',
    asset: 'ETH/USDC', side: 'short', pnl: -4.25, reason: 'stop loss',
    bots: { name: 'MACD Vol', slug: 'macd-vol', family: 'momentum', status: 'paper' } },
  { id: 'tr-3', opened_at: '2026-07-28T08:00:00Z', closed_at: '2026-07-28T20:00:00Z',
    asset: 'SOL/USDC', side: 'long', pnl: 3.1, reason: 'take profit',
    bots: { name: 'ORB H1 HL', slug: 'orb-bf25', family: 'breakout', status: 'live' } },
]

vi.mock('next/navigation', () => ({
  usePathname: () => '/overview',
}))

const AGG = computeFleetAggregate(
  [
    { bot_id: 'id-1', pnl: 40, closed_at: '2026-07-01T00:00:00Z', side: 'long', asset: 'BTC' },
    { bot_id: 'id-99', pnl: -60, closed_at: '2026-07-02T00:00:00Z', side: 'short', asset: 'ETH' },
  ],
  [{ id: 'id-1', live_since: '2026-01-01T00:00:00Z' }],
)

beforeEach(() => {
  curveProps.length = 0
  window.history.replaceState(null, '', '/overview')
})

type Props = Parameters<typeof FleetOverview>[0]
const renderFleet = (over: Partial<Props> = {}) => render(
  <FleetOverview bots={toSummaryBots(FIXTURE_FLEET)} aggregate={AGG} recentTrades={RECENT} initialState={EMPTY_FILTERS} minutes={26} {...over} />,
)

describe('FleetOverview — stage 0 invariant', () => {
  it('does not move the totals when a filter is applied, and the register does', () => {
    renderFleet()
    const totalsBefore = screen.getByTestId('fleet-totals').textContent
    const registerBefore = screen.getByTestId('fleet-register').textContent
    fireEvent.change(screen.getByRole('combobox', { name: /Famille/ }), { target: { value: 'breakout' } })
    expect(screen.getByTestId('fleet-totals').textContent).toBe(totalsBefore)
    expect(screen.getByTestId('fleet-register').textContent).not.toBe(registerBefore)
  })

  it('renders the totals before the filter controls in document order', () => {
    const { container } = renderFleet()
    const html = container.innerHTML
    expect(html.indexOf('data-testid="fleet-totals"')).toBeLessThan(html.indexOf('data-testid="fleet-filters"'))
  })
})

describe('FleetOverview — the sections, in order', () => {
  it('renders totals, register, journal, curves, recent trades, and no weather', () => {
    const { container } = renderFleet()
    const html = container.innerHTML
    const order = ['fleet-totals', 'fleet-register', 'fleet-journal', 'fleet-equity-curves', 'fleet-recent-trades']
      .map(id => ({ id, at: html.indexOf(`data-testid="${id}"`) }))
    for (const { id, at } of order) expect(at, `${id} is absent`).toBeGreaterThanOrEqual(0)
    const positions = order.map(o => o.at)
    expect(positions, order.map(o => o.id).join(' < ')).toEqual([...positions].sort((a, b) => a - b))
    expect(screen.queryByTestId('fleet-mi')).toBeNull()
    expect(container.textContent).not.toMatch(/Météo du marché|Trading autorisé/)
  })

  it('lists the real-money bots as rows of the one list, with their regime and the state of their rule', () => {
    renderFleet()
    expect(screen.queryByTestId('fleet-real')).toBeNull()
    expect(screen.queryByTestId('fleet-bot-card')).toBeNull()
    const register = screen.getByTestId('fleet-register')
    const orb = within(register).getByRole('link', { name: 'ORB H1 HL' }).closest('tr')!
    expect(orb.textContent).toMatch(/Argent réel/)
    // ORB's published rule (PF < 1.0 after 20 trades) is crossed in the fixture, and kept.
    expect(within(orb).getByTestId('fleet-row-state').textContent).toMatch(/Règle d’arrêt franchie.*Je le garde/)
    const sim = within(register).getByRole('link', { name: 'MACD Volume H4 BF' }).closest('tr')!
    expect(sim.textContent).toMatch(/Simulation/)
  })

  it('never mixes the two regimes in a total: the register prints no sum, the totals stay two', () => {
    renderFleet()
    expect(screen.getByTestId('fleet-total-real')).toBeTruthy()
    expect(screen.getByTestId('fleet-total-labo')).toBeTruthy()
    expect(within(screen.getByTestId('fleet-register')).queryByText(/^Total/)).toBeNull()
  })

  it('folds the journal and the curves; the curves carry the live bots and one simulation series', () => {
    renderFleet()
    const journal = screen.getByTestId('fleet-journal')
    expect(within(journal).getByRole('button', { name: /Trades journaliers/ }).getAttribute('aria-expanded')).toBe('false')
    const curves = screen.getByTestId('fleet-equity-curves')
    expect(within(curves).getByRole('button', { name: /Courbes 30 jours/ }).getAttribute('aria-expanded')).toBe('false')
    const drawn = curveProps.at(-1)!.bots
    // Longest history first in the curves' legend.
    const liveSlugs = FIXTURE_FLEET.filter(b => b.status === 'live')
      .sort((a, b) => b.stats.total_trades - a.stats.total_trades).map(b => b.slug)
    expect(drawn.map(b => b.slug)).toEqual([...liveSlugs, 'simulation'])
    expect(drawn.length).toBeLessThanOrEqual(4)
    expect(drawn.at(-1)!.name).toMatch(/Simulation/)
  })

  it('keeps totals, journal, curves and feed outside the register, so no filter can reach them', () => {
    renderFleet()
    const register = screen.getByTestId('fleet-register')
    for (const id of ['fleet-totals', 'fleet-journal', 'fleet-equity-curves', 'fleet-recent-trades']) {
      expect(register.contains(screen.getByTestId(id))).toBe(false)
    }
    const feedBefore = screen.getByTestId('fleet-recent-trades').textContent
    fireEvent.change(screen.getByRole('combobox', { name: /Famille/ }), { target: { value: 'breakout' } })
    expect(screen.getByTestId('fleet-recent-trades').textContent).toBe(feedBefore)
  })

  it('omits the feed entirely rather than printing an empty table', () => {
    renderFleet({ recentTrades: [] })
    expect(screen.queryByTestId('fleet-recent-trades')).toBeNull()
  })
})

describe('FleetOverview — what crosses the client boundary', () => {
  const day = (offset: number) => new Date(Date.now() - offset * 86400_000).toISOString().slice(0, 10)
  const perf = (dates: string[], base = 1000): PerfDaily[] =>
    dates.map((date, i) => ({ id: `p${i}`, bot_id: 'b', date, capital: base + i, pnl_day: 0, win_rate: null, profit_factor: null }))

  it('windows the live curves to 30 days before the boundary, and sums the paper bots into one series', () => {
    const live = mkBot({ slug: 'live-history', status: 'live', live_since: '2026-01-01T00:00:00Z',
      perf_daily: perf([day(400), day(200), day(90), day(10), day(1)]) })
    const paperA = mkBot({ slug: 'paper-a', status: 'paper', start_capital: 1000, perf_daily: perf([day(10), day(1)], 1010) })
    const paperB = mkBot({ slug: 'paper-b', status: 'paper', start_capital: 1000, perf_daily: perf([day(5)], 990) })
    renderFleet({ bots: toSummaryBots([live, paperA, paperB]) })
    const drawn = curveProps.at(-1)!.bots
    expect(drawn.find(b => b.slug === 'live-history')!.data.map(d => d.date)).toEqual([day(10), day(1)])
    const sim = drawn.find(b => b.slug === 'simulation')!
    expect(sim.data).toEqual([
      { date: day(10), capital: 10 },
      { date: day(5), capital: 0 },
      { date: day(1), capital: 1 },
    ])
  })
})

describe('FleetOverview — remounts on a new server-sent filter state', () => {
  it('drops a stale filter when a new (empty) initialState arrives via rerender', () => {
    const { rerender } = render(
      <FleetOverview bots={toSummaryBots(FIXTURE_FLEET)} aggregate={AGG} recentTrades={RECENT} initialState={{ ...EMPTY_FILTERS, family: ['breakout'] }} minutes={null} />,
    )
    expect((screen.getByRole('combobox', { name: /Famille/ }) as HTMLSelectElement).value).toBe('breakout')
    rerender(
      <FleetOverview bots={toSummaryBots(FIXTURE_FLEET)} aggregate={AGG} recentTrades={RECENT} initialState={EMPTY_FILTERS} minutes={null} />,
    )
    expect((screen.getByRole('combobox', { name: /Famille/ }) as HTMLSelectElement).value).toBe('')
  })
})
