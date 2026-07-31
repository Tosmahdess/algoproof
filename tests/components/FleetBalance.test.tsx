import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import FleetBalance from '@/components/FleetBalance'
import { computeFleetAggregate } from '@/lib/fleet-aggregate'
import { fmtEur } from '@/lib/display'

// Two trades on two different days so computeFleetAggregate produces two
// distinct DayRow entries — needed to exercise the day-by-day table (fix
// round 1, I6), not just the headline totals. One belongs to a live bot
// (id-1) and one does not, so the two cohorts are both non-zero and the
// fusion this component used to print is actually reachable.
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

  // FIX (final review, C2): the test above was the whole of this component's
  // fusion coverage, and it only asserted that two LABELS existed — which is
  // why it stayed green while the day table two lines below printed
  // totalPnlReal + totalPnlLabo in its first Cumul cell, directly under the
  // sentence promising those totals never fuse. Assert the number itself is
  // absent from the rendered section, not that the labels are present.
  it('renders no figure anywhere equal to real + laboratoire', () => {
    render(<FleetBalance aggregate={AGG} />)
    const stage0 = screen.getByTestId('fleet-balance')
    const fused = fmtEur(AGG.totalPnlReal + AGG.totalPnlLabo)
    // Guard the guard: the fused value must be distinguishable from both
    // cohort totals, otherwise this assertion could pass for the wrong reason.
    expect(fused).not.toBe(fmtEur(AGG.totalPnlReal))
    expect(fused).not.toBe(fmtEur(AGG.totalPnlLabo))
    expect(within(stage0).queryByText(fused)).toBeNull()
    expect(stage0.textContent).not.toContain(fused)
  })

  it('renders the day-by-day journal split by cohort, with no cumulative column', () => {
    render(<FleetBalance aggregate={AGG} />)
    const stage0 = screen.getByTestId('fleet-balance')
    // Newest first: 2026-07-02 (laboratory loss, -60) then 2026-07-01 (real win, +40).
    expect(within(stage0).getByText('2/7/2026')).toBeTruthy()
    expect(within(stage0).getByText('1/7/2026')).toBeTruthy()

    const table = within(stage0).getByTestId('fleet-balance-table')
    // FIX (final whole-branch review, I7): four columns, not six. « Taux de
    // gain » and « F. profit » were computed across both cohorts and rendered
    // one column left of the split P&L — on a day where the live bot loses and
    // the laboratory wins, that profit factor described neither.
    expect(within(table).getAllByRole('columnheader')).toHaveLength(4)
    expect(within(table).getByText(/P&L réel/)).toBeTruthy()
    expect(within(table).getByText(/P&L labo/)).toBeTruthy()
    expect(within(table).queryByText('Cumul')).toBeNull()
    expect(within(table).queryByText('Taux de gain')).toBeNull()
    expect(within(table).queryByText('F. profit')).toBeNull()

    // Each day's euros land in the right cohort column: +40 on the real side
    // of 1/7, -60 on the laboratory side of 2/7, and each exactly once.
    const rows = within(table).getAllByRole('row').slice(1) // drop the header row
    const cells = (i: number) => within(rows[i]).getAllByRole('cell').map(c => c.textContent)
    expect(cells(0)).toEqual(['2/7/2026', '1', '+0.00€', '-60.00€'])
    expect(cells(1)).toEqual(['1/7/2026', '1', '+40.00€', '+0.00€'])
  })

  // AGG mixes cohorts: one live trade and one laboratory trade, on different
  // days. Any cross-cohort rate this table printed would be built from exactly
  // that mixture.
  it('prints no rate or ratio computed across the two cohorts', () => {
    render(<FleetBalance aggregate={AGG} />)
    const stage0 = screen.getByTestId('fleet-balance')
    expect(stage0.textContent).not.toMatch(/%/)
    expect(stage0.textContent).not.toMatch(/profit/i)
  })
})
