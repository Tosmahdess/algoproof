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
    // FIX round 2 (Minor): the previous version of this test asserted
    // `getAllByText(...).length > 0` against the WHOLE fleet-balance section,
    // which is inert — "-60.00€" and "+40.00€" both already appear in the
    // headline totals above the table (the "Laboratoire" total equals day
    // 2's P&L, and day 1's P&L equals its own cumulative total since it's
    // the first day), so those assertions would pass even if the table
    // itself rendered nothing. Scope to the table specifically, where each
    // value appears exactly once, and assert singular presence.
    const table = within(stage0).getByTestId('fleet-balance-table')
    // Scoping to the table alone already makes this test meaningful: if
    // `aggregate.rows` failed to render, getByTestId above would throw before
    // we even reach these assertions. "-60.00€" is unique within the table
    // (day 2's P&L cell). "+40.00€" still appears twice WITHIN the table
    // itself (day 1's P&L and cumulative are both +40 on the first day, a
    // property of the fixture data, not a leak from the headline) — assert
    // via count.
    expect(within(table).getByText('-60.00€')).toBeTruthy()
    expect(within(table).getAllByText('+40.00€')).toHaveLength(2)
    // Column headers: date, trades, win rate, profit factor, P&L, cumulative.
    expect(within(table).getByText('Taux de gain')).toBeTruthy()
    expect(within(table).getByText('F. profit')).toBeTruthy()
    expect(within(table).getByText('Cumul')).toBeTruthy()
  })
})
