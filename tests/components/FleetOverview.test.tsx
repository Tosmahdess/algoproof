import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import FleetOverview from '@/components/FleetOverview'
import { computeFleetAggregate } from '@/lib/fleet-aggregate'
import { EMPTY_FILTERS } from '@/lib/bot-filters'
import { FIXTURE_FLEET } from '../fixtures/bots'

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
    render(<FleetOverview bots={FIXTURE_FLEET} aggregate={AGG} initialState={EMPTY_FILTERS} />)
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
      <FleetOverview bots={FIXTURE_FLEET} aggregate={AGG} initialState={EMPTY_FILTERS} />,
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
    render(<FleetOverview bots={FIXTURE_FLEET} aggregate={AGG} initialState={EMPTY_FILTERS} />)
    // A representative /strategies link from the filterable register — if the
    // CSR bailout were still happening, this component tree would contain an
    // animate-pulse fallback instead of this link, and getByRole would fail
    // synchronously rather than resolving after a suspended child settles.
    const link = screen.getByRole('link', { name: /ORB H1 HL/ })
    expect(link.getAttribute('href')).toBe('/strategies/orb-bf25')
  })

  it('seeds the register from a non-empty initial filter state (server-parsed searchParams)', () => {
    render(
      <FleetOverview
        bots={FIXTURE_FLEET}
        aggregate={AGG}
        initialState={{ ...EMPTY_FILTERS, family: ['breakout'] }}
      />,
    )
    const register = screen.getByTestId('fleet-register')
    // Only breakout-family register bots (atrchannel-k3, new-venue-bot) — no
    // trend/momentum/etc. group headers (Ichimoku is trend, and would be
    // present in the register unfiltered — see FleetRegister.test.tsx), and
    // the filter pill itself reads active.
    expect(within(register).getByText(/ATR Channel/)).toBeTruthy()
    expect(within(register).getByText(/Donchian/)).toBeTruthy()
    expect(within(register).queryByText(/Ichimoku/)).toBeNull()
    expect(screen.getByRole('button', { name: /Cassure \(2\)/ })).toHaveAttribute('aria-pressed', 'true')
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
        initialState={{ ...EMPTY_FILTERS, family: ['breakout'] }}
      />,
    )
    expect(screen.getByRole('button', { name: /Cassure \(2\)/ })).toHaveAttribute('aria-pressed', 'true')
    expect(within(screen.getByTestId('fleet-register')).queryByText(/Ichimoku/)).toBeNull()

    rerender(<FleetOverview bots={FIXTURE_FLEET} aggregate={AGG} initialState={EMPTY_FILTERS} />)

    expect(screen.getByRole('button', { name: /Cassure \(2\)/ })).toHaveAttribute('aria-pressed', 'false')
    expect(within(screen.getByTestId('fleet-register')).getByText(/Ichimoku/)).toBeTruthy()
  })
})
