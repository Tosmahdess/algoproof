import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import FleetTotals from '@/components/FleetTotals'
import { computeFleetAggregate } from '@/lib/fleet-aggregate'
import { fmtEur } from '@/lib/display'

// Lot 4 of the design audit (2026-09-25, conception §5.2): the fleet opens on its
// two totals, each with its denominator (bots, trades), never fused (R1). The
// « 96 / 3 » tiles with icons and the market-weather banner that used to open
// the page are gone: the home already counts the fleet, /intelligence already
// shows the weather.
const AGG = computeFleetAggregate(
  [
    { bot_id: 'live-1', pnl: 40, closed_at: '2026-07-01T00:00:00Z', side: 'long', asset: 'BTC' },
    { bot_id: 'live-1', pnl: 12.5, closed_at: '2026-07-03T00:00:00Z', side: 'long', asset: 'BTC' },
    { bot_id: 'paper-1', pnl: -60, closed_at: '2026-07-02T00:00:00Z', side: 'short', asset: 'ETH' },
    { bot_id: 'paper-2', pnl: 1234.56, closed_at: '2026-07-02T00:00:00Z', side: 'short', asset: 'ETH' },
    { bot_id: 'paper-2', pnl: 0.44, closed_at: '2026-07-04T00:00:00Z', side: 'short', asset: 'ETH' },
  ],
  [{ id: 'live-1', live_since: '2026-01-01T00:00:00Z' }],
)

describe('FleetTotals', () => {
  it('shows the real-money total with its bots and trades', () => {
    render(<FleetTotals aggregate={AGG} liveCount={3} paperCount={93} />)
    const real = screen.getByTestId('fleet-total-real')
    expect(within(real).getByText('Argent réel')).toBeTruthy()
    expect(real.textContent).toContain(fmtEur(52.5))
    expect(real.textContent).toMatch(/3 bots/)
    expect(real.textContent).toMatch(/2 trades/)
  })

  it('shows the simulation total with its bots and trades, French thousands', () => {
    render(<FleetTotals aggregate={AGG} liveCount={3} paperCount={1234} />)
    const labo = screen.getByTestId('fleet-total-labo')
    expect(within(labo).getByText('Simulation')).toBeTruthy()
    expect(labo.textContent).toContain(fmtEur(1175))
    expect(labo.textContent!.replace(/\u202F/g, ' ')).toMatch(/1 234 bots/)
    expect(labo.textContent).toMatch(/3 trades/)
  })

  it('never prints the fused total, and says so', () => {
    const { container } = render(<FleetTotals aggregate={AGG} liveCount={3} paperCount={93} />)
    expect(container.textContent).not.toContain(fmtEur(52.5 + 1175))
    expect(container.textContent).not.toMatch(/5 trades/)
    expect(container.textContent).toMatch(/ne se fusionnent jamais/)
  })

  it('writes its figures in mono, and the loss in red, the gain in green', () => {
    const lossAgg = computeFleetAggregate(
      [{ bot_id: 'live-1', pnl: -9.5, closed_at: '2026-07-01T00:00:00Z', side: 'long', asset: 'BTC' }],
      [{ id: 'live-1', live_since: '2026-01-01T00:00:00Z' }],
    )
    render(<FleetTotals aggregate={lossAgg} liveCount={1} paperCount={0} />)
    const real = screen.getByTestId('fleet-total-real')
    // getByText collapses the narrow no-break space of fmtEur to a plain space.
    const plain = (t: string) => t.replace(/\u202F/g, ' ')
    const figure = within(real).getByText(plain(fmtEur(-9.5)))
    expect(figure.className).toMatch(/font-mono/)
    expect(figure.className).toMatch(/text-negative/)
    const labo = screen.getByTestId('fleet-total-labo')
    expect(within(labo).getByText(plain(fmtEur(0))).className).not.toMatch(/text-negative/)
  })
})
