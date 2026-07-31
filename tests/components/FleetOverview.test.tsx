import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import FleetOverview from '@/components/FleetOverview'
import { computeFleetAggregate } from '@/lib/fleet-aggregate'
import { EMPTY_FILTERS } from '@/lib/bot-filters'
import type { TradeWithBot } from '@/lib/types'
import { FIXTURE_FLEET, mkBot } from '../fixtures/bots'
import type { PerfDaily } from '@/lib/types'

// FIX (re-review, residual 2): GlobalEquityCurve is a client component, so
// whatever FleetOverview puts in its props crosses the RSC boundary and is
// serialized into the payload. Capturing the props is the only way to assert
// that the 30-day window is applied BEFORE the boundary rather than inside the
// chart. The mock keeps the wrapper section's own assertions intact — the
// `fleet-equity-curves` testid lives on FleetOverview's <section>, not here.
const curveProps: { bots: { slug: string; data: { date: string }[] }[] }[] = []
vi.mock('@/components/GlobalEquityCurve', () => ({
  default: (props: { bots: { slug: string; data: { date: string }[] }[] }) => {
    curveProps.push(props)
    return <div data-testid="equity-curve-stub" />
  },
}))

// FIX (final review, I1+I2): stage 0 now also carries the market-intelligence
// banner, the 30-day equity curves and the fleet-wide recent-trades feed —
// three pieces the retired /overview page had and that vanished with
// OverviewClient without anyone deciding to retire them.
const RECENT: TradeWithBot[] = [
  { id: 'tr-1', opened_at: '2026-07-30T08:00:00Z', closed_at: '2026-07-30T12:00:00Z',
    asset: 'BTC/USDC', side: 'long', pnl: 12.5, reason: 'take profit',
    bots: { name: 'ORB H1 HL', slug: 'orb-bf25', family: 'breakout', status: 'live' } },
  { id: 'tr-2', opened_at: '2026-07-29T08:00:00Z', closed_at: '2026-07-29T20:00:00Z',
    asset: 'ETH/USDC', side: 'short', pnl: -4.25, reason: 'stop loss',
    bots: { name: 'MACD Vol', slug: 'macd-vol', family: 'momentum', status: 'paper' } },
]

// FIX round 2: FleetRegister (rendered by FleetOverview) no longer calls
// useSearchParams(), so this mock only needs usePathname.
vi.mock('next/navigation', () => ({
  usePathname: () => '/overview',
}))

const AGG = computeFleetAggregate(
  [
    { bot_id: 'id-1', pnl: 40, closed_at: '2026-07-01T00:00:00Z', side: 'long', asset: 'BTC' },
    { bot_id: 'id-99', pnl: -60, closed_at: '2026-07-02T00:00:00Z', side: 'short', asset: 'ETH' },
  ],
  ['id-1'],
)

beforeEach(() => {
  // MiBanner (restored into stage 0) fetches /api/mi on mount.
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => null }))
})

// Fix round 1, I3: the original invariant test only asserted the balance sheet
// didn't move. That assertion stays true even when filtering is completely
// inert (exactly the bug fixed in the first round — the click never applied
// because state was reset from a non-memoized searchParams on every render),
// so a passing test told us nothing. It now also asserts the register DID
// change, so the test can't go green while filtering is broken.
describe('FleetOverview — stage 0 invariant', () => {
  it('does not move the balance sheet when a filter is applied, and the register does', () => {
    render(<FleetOverview bots={FIXTURE_FLEET} aggregate={AGG} recentTrades={RECENT} initialState={EMPTY_FILTERS} />)
    const balanceBefore = screen.getByTestId('fleet-balance').textContent
    const registerBefore = screen.getByTestId('fleet-register').textContent

    fireEvent.click(screen.getByRole('button', { name: /Cassure/ }))

    expect(screen.getByTestId('fleet-balance').textContent).toBe(balanceBefore)
    expect(screen.getByTestId('fleet-register').textContent).not.toBe(registerBefore)
  })

  // Fix round 1, I4: `indexOf` returns -1 for a missing node, and `-1 < 5` is
  // true — so this test could not fail even if stage 0 were deleted entirely.
  // Assert both testids are actually present (index >= 0) before comparing.
  it('renders the balance sheet before the filter controls in document order', () => {
    const { container } = render(
      <FleetOverview bots={FIXTURE_FLEET} aggregate={AGG} recentTrades={RECENT} initialState={EMPTY_FILTERS} />,
    )
    const html = container.innerHTML
    const balanceIdx = html.indexOf('data-testid="fleet-balance"')
    const filtersIdx = html.indexOf('data-testid="fleet-filters"')
    expect(balanceIdx).toBeGreaterThanOrEqual(0)
    expect(filtersIdx).toBeGreaterThanOrEqual(0)
    expect(balanceIdx).toBeLessThan(filtersIdx)
  })
})

// Fix round 2 (new Important finding): the whole point of seeding filter
// state server-side is that the register's real content — bot cards,
// /strategies links — is present in a single synchronous render() with no
// Suspense/CSR bailout anywhere in the tree. These two tests are the
// verification the ruling asked for in place of a browser-driven `next
// build` check (which can't run against real Supabase in this environment).
describe('FleetOverview — server-rendered register (fix round 2)', () => {
  it('renders the register\'s bot links in a single synchronous render, no Suspense involved', () => {
    render(<FleetOverview bots={FIXTURE_FLEET} aggregate={AGG} recentTrades={RECENT} initialState={EMPTY_FILTERS} />)
    // A representative /strategies link from the filterable register — if the
    // CSR bailout were still happening, this component tree would contain an
    // animate-pulse fallback instead of this link, and getByRole would fail
    // synchronously rather than resolving after a suspended child settles.
    // Scoped to the register: since I1+I2 restored the fleet-wide recent-trades
    // feed into stage 0, the same bot name is also a link up there.
    const register = screen.getByTestId('fleet-register')
    const link = within(register).getByRole('link', { name: /ORB H1 HL/ })
    expect(link.getAttribute('href')).toBe('/strategies/bot/orb-bf25')
  })

  it('seeds the register from a non-empty initial filter state (server-parsed searchParams)', () => {
    render(
      <FleetOverview
        bots={FIXTURE_FLEET}
        aggregate={AGG}
        recentTrades={RECENT}
        initialState={{ ...EMPTY_FILTERS, family: ['breakout'] }}
      />,
    )
    const register = screen.getByTestId('fleet-register')
    // Only breakout-family register bots (atrchannel-k3, donchian-bf17) — no
    // trend/momentum/etc. group headers (Ichimoku is trend, and would be
    // present in the register unfiltered — see FleetRegister.test.tsx), and
    // the filter pill itself reads active. getAllByText for Donchian: since the
    // register groups on the fiche, the group header (« Donchian Breakout », a
    // link to the concept page) and the bot row both carry the word.
    expect(within(register).getByText(/ATR Channel/)).toBeTruthy()
    expect(within(register).getAllByText(/Donchian/).length).toBeGreaterThan(0)
    expect(within(register).getByRole('link', { name: 'Donchian Breakout' })
      .getAttribute('href')).toBe('/strategies/donchian')
    expect(within(register).queryByText(/Ichimoku/)).toBeNull()
    expect(screen.getByRole('button', { name: /Cassure \(2\)/ })).toHaveAttribute('aria-pressed', 'true')
  })
})

// FIX (final review, I1+I2): GlobalEquityCurve and MiBanner had zero importers
// after OverviewClient was deleted, and the fleet-wide recent-trades feed
// existed on no page at all. Nobody decided to retire any of the three. They
// are restored into stage 0 — page-level, unfiltered, cohort-safe — and these
// tests pin that they are there AND that they sit outside the filter pipeline.
describe('FleetOverview — restored stage-0 content', () => {
  it('renders the market-intelligence banner, the equity curves and the recent-trades feed', () => {
    render(
      <FleetOverview bots={FIXTURE_FLEET} aggregate={AGG} recentTrades={RECENT} initialState={EMPTY_FILTERS} />,
    )
    expect(screen.getByTestId('fleet-mi')).toBeTruthy()
    expect(screen.getByTestId('fleet-equity-curves')).toBeTruthy()
    const feed = screen.getByTestId('fleet-recent-trades')
    expect(within(feed).getByText('BTC/USDC')).toBeTruthy()
    expect(within(feed).getByRole('link', { name: 'MACD Vol' }).getAttribute('href'))
      .toBe('/strategies/bot/macd-vol')
  })

  it('keeps all three outside the register, so no filter can reach them', () => {
    render(
      <FleetOverview bots={FIXTURE_FLEET} aggregate={AGG} recentTrades={RECENT} initialState={EMPTY_FILTERS} />,
    )
    const register = screen.getByTestId('fleet-register')
    for (const id of ['fleet-mi', 'fleet-equity-curves', 'fleet-recent-trades', 'fleet-balance']) {
      expect(register.contains(screen.getByTestId(id))).toBe(false)
    }

    const feedBefore = screen.getByTestId('fleet-recent-trades').textContent
    const curvesBefore = screen.getByTestId('fleet-equity-curves').textContent
    fireEvent.click(screen.getByRole('button', { name: /Cassure/ }))
    expect(screen.getByTestId('fleet-recent-trades').textContent).toBe(feedBefore)
    expect(screen.getByTestId('fleet-equity-curves').textContent).toBe(curvesBefore)
  })

  // FIX (re-review, residual 2): FleetOverview used to map `b.perf_daily` in
  // full into the curve props and let the client component apply the 30-day
  // cutoff — shipping twelve bots' entire history across the boundary to draw
  // thirty days of it. Same principle FleetBalance states two files away.
  it('windows the equity-curve data to 30 days before it crosses the client boundary', () => {
    const day = (offset: number) =>
      new Date(Date.now() - offset * 86400_000).toISOString().slice(0, 10)
    const perf = (dates: string[]): PerfDaily[] =>
      dates.map((date, i) => ({
        id: `p${i}`, bot_id: 'b', date, capital: 1000 + i,
        pnl_day: 0, win_rate: null, profit_factor: null,
      }))
    const bot = mkBot({
      slug: 'long-history',
      // two rows inside the window, three well outside it
      perf_daily: perf([day(400), day(200), day(90), day(10), day(1)]),
    })

    curveProps.length = 0
    render(
      <FleetOverview bots={[bot]} aggregate={AGG} recentTrades={RECENT} initialState={EMPTY_FILTERS} />,
    )

    const drawn = curveProps.at(-1)!.bots.find(b => b.slug === 'long-history')!
    expect(drawn.data.map(d => d.date)).toEqual([day(10), day(1)])
  })

  it('omits the feed entirely rather than printing an empty table', () => {
    render(
      <FleetOverview bots={FIXTURE_FLEET} aggregate={AGG} recentTrades={[]} initialState={EMPTY_FILTERS} />,
    )
    expect(screen.queryByTestId('fleet-recent-trades')).toBeNull()
  })
})

// Fix round 3, Finding A: FleetRegister seeds useState(initialState) ONCE and
// never resyncs from the prop afterwards — correct for a real navigation
// (server remounts, fresh initialState arrives with it), but the App Router
// keys a page segment WITHOUT its search params, so a search-params-only
// navigation (e.g. clicking a plain nav <Link href="/overview"> while already
// on /overview?family=breakout) re-renders this same FleetRegister instance
// instead of remounting it — the filter would stay stuck on-screen even
// though the server just sent EMPTY_FILTERS. The fix is a `key` on
// <FleetRegister> in FleetOverview, derived from the serialized
// initialState: a new value is a new key, which forces React to unmount the
// stale instance and mount a fresh one. rerender() with a new initialState is
// the test-level equivalent of "the server sent something different this
// time" — exactly what a real client-side navigation to a new /overview URL
// looks like from FleetOverview's perspective.
describe('FleetOverview — remounts on a new server-sent filter state (fix round 3, Finding A)', () => {
  it('drops a stale filter when a new (empty) initialState arrives via rerender', () => {
    const { rerender } = render(
      <FleetOverview
        bots={FIXTURE_FLEET}
        aggregate={AGG}
        recentTrades={RECENT}
        initialState={{ ...EMPTY_FILTERS, family: ['breakout'] }}
      />,
    )
    expect(screen.getByRole('button', { name: /Cassure \(2\)/ })).toHaveAttribute('aria-pressed', 'true')
    expect(within(screen.getByTestId('fleet-register')).queryAllByText(/Ichimoku/)).toHaveLength(0)

    rerender(<FleetOverview bots={FIXTURE_FLEET} aggregate={AGG} recentTrades={RECENT} initialState={EMPTY_FILTERS} />)

    expect(screen.getByRole('button', { name: /Cassure \(2\)/ })).toHaveAttribute('aria-pressed', 'false')
    expect(within(screen.getByTestId('fleet-register')).getAllByText(/Ichimoku/).length)
      .toBeGreaterThan(0)
  })
})
