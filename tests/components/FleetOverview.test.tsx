import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FleetOverview from '@/components/FleetOverview'
import { computeFleetAggregate } from '@/lib/fleet-aggregate'
import { FIXTURE_FLEET } from '../fixtures/bots'

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
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
    render(<FleetOverview bots={FIXTURE_FLEET} aggregate={AGG} />)
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
    const { container } = render(<FleetOverview bots={FIXTURE_FLEET} aggregate={AGG} />)
    const html = container.innerHTML
    const balanceIdx = html.indexOf('data-testid="fleet-balance"')
    const filtersIdx = html.indexOf('data-testid="fleet-filters"')
    expect(balanceIdx).toBeGreaterThanOrEqual(0)
    expect(filtersIdx).toBeGreaterThanOrEqual(0)
    expect(balanceIdx).toBeLessThan(filtersIdx)
  })
})
