import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import FleetBalance from '@/components/FleetBalance'
import { computeFleetAggregate } from '@/lib/fleet-aggregate'

// Two trades on two different days so computeFleetAggregate produces two
// distinct DayRow entries — needed to exercise the day-by-day table (fix
// round 1, I6), not just the headline totals.
const AGG = computeFleetAggregate(
  [
    { bot_id: 'id-1', pnl: 40, closed_at: '2026-07-01T00:00:00Z', side: 'long', asset: 'BTC' },
    { bot_id: 'id-99', pnl: -60, closed_at: '2026-07-02T00:00:00Z', side: 'short', asset: 'ETH' },
  ],
  ['id-1'],
)

describe('FleetBalance — stage 0', () => {
  it('never fuses real and laboratory into a single headline number', () => {
    render(<FleetBalance aggregate={AGG} />)
    const stage0 = screen.getByTestId('fleet-balance')
    expect(within(stage0).getByText(/Argent réel/i)).toBeTruthy()
    expect(within(stage0).getByText(/Laboratoire/i)).toBeTruthy()
  })

  it('renders the day-by-day journal the retired /performance page showed (fix round 1, I6)', () => {
    render(<FleetBalance aggregate={AGG} />)
    const stage0 = screen.getByTestId('fleet-balance')
    // Newest first: 2026-07-02 (loss, -60) then 2026-07-01 (win, +40).
    expect(within(stage0).getByText('2/7/2026')).toBeTruthy()
    expect(within(stage0).getByText('1/7/2026')).toBeTruthy()
    // "-60.00€" and "+40.00€" each appear twice by coincidence: the headline
    // "Laboratoire" total and day 2's P&L are both -60.00€ (the only
    // laboratoire trade in this fixture IS that day's trade), and day 1's
    // P&L and its cumulative total are both +40.00€ (it's the first day) —
    // assert presence via count rather than a single-match query.
    expect(within(stage0).getAllByText('-60.00€').length).toBeGreaterThan(0)
    expect(within(stage0).getAllByText('+40.00€').length).toBeGreaterThan(0)
    // Column headers: date, trades, win rate, profit factor, P&L, cumulative.
    expect(within(stage0).getByText('Taux de gain')).toBeTruthy()
    expect(within(stage0).getByText('F. profit')).toBeTruthy()
    expect(within(stage0).getByText('Cumul')).toBeTruthy()
  })
})
