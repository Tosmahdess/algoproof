import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import FleetClient from '@/components/FleetClient'
import { computeFleetAggregate } from '@/lib/fleet-aggregate'
import { FIXTURE_FLEET } from '../fixtures/bots'

vi.mock('@/components/MiBanner', () => ({ default: () => null }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
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

describe('FleetClient — stage 0 invariant', () => {
  it('does not move the balance sheet when a filter is applied', () => {
    render(<FleetClient bots={FIXTURE_FLEET} aggregate={AGG} />)
    const stage0 = screen.getByTestId('fleet-balance')
    const before = stage0.textContent

    fireEvent.click(screen.getByRole('button', { name: /Cassure/ }))

    expect(screen.getByTestId('fleet-balance').textContent).toBe(before)
  })

  it('renders the balance sheet before the filter controls in document order', () => {
    const { container } = render(<FleetClient bots={FIXTURE_FLEET} aggregate={AGG} />)
    const html = container.innerHTML
    expect(html.indexOf('data-testid="fleet-balance"'))
      .toBeLessThan(html.indexOf('data-testid="fleet-filters"'))
  })

  it('never fuses real and laboratory into a single headline number', () => {
    render(<FleetClient bots={FIXTURE_FLEET} aggregate={AGG} />)
    const stage0 = screen.getByTestId('fleet-balance')
    expect(within(stage0).getByText(/Argent réel/i)).toBeTruthy()
    expect(within(stage0).getByText(/Laboratoire/i)).toBeTruthy()
  })
})

describe('FleetClient — the register', () => {
  it('pins real-money bots to their own stage, outside the filterable register', () => {
    render(<FleetClient bots={FIXTURE_FLEET} aggregate={AGG} />)
    const real = screen.getByTestId('fleet-real')
    expect(within(real).getByText('EMA Cross H4 Kraken')).toBeTruthy()
    expect(within(real).getByText('ORB H1 HL')).toBeTruthy()
  })

  it('lists a deployed bot that has never traded', () => {
    render(<FleetClient bots={FIXTURE_FLEET} aggregate={AGG} />)
    expect(screen.getAllByText(/Ichimoku/).length).toBeGreaterThan(0)
  })

  it('collapses archived bots but keeps them present', () => {
    render(<FleetClient bots={FIXTURE_FLEET} aggregate={AGG} />)
    const archived = screen.getByTestId('fleet-archived')
    expect(archived.tagName.toLowerCase()).toBe('details')
    expect(archived.hasAttribute('open')).toBe(false)
    expect(within(archived).getByText(/TSMOM/)).toBeTruthy()
  })

  it('shows a count next to every family option', () => {
    render(<FleetClient bots={FIXTURE_FLEET} aggregate={AGG} />)
    expect(screen.getByRole('button', { name: /Momentum \(1\)/ })).toBeTruthy()
  })

  it('names the responsible filter when a combination returns nothing', () => {
    render(<FleetClient bots={FIXTURE_FLEET} aggregate={AGG} />)
    fireEvent.click(screen.getByRole('button', { name: /Portage/ }))
    fireEvent.click(screen.getByRole('button', { name: /Kraken/ }))
    expect(screen.getByTestId('fleet-empty').textContent).toMatch(/Kraken|Portage/)
  })
})
