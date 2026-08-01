import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FleetDayTable from '@/components/FleetDayTable'
import type { DayRow } from '@/lib/fleet-aggregate'

// Newest-first, like computeFleetAggregate's real output — the component
// itself does not sort, it only slices. `date` only needs to be a unique
// React key here; the component never parses it.
function mkRows(n: number): DayRow[] {
  return Array.from({ length: n }, (_, i) => ({
    date: `day-${n - i}`,
    dateFr: `Jour ${n - i}`,
    trades: 1,
    pnlReal: i,
    pnlLabo: 0,
  }))
}

describe('FleetDayTable', () => {
  it('shows only the first 7 rows collapsed', () => {
    render(<FleetDayTable rows={mkRows(23)} />)
    // 1 header row + 7 data rows.
    expect(screen.getAllByRole('row')).toHaveLength(8)
    expect(screen.getByText('Jour 23')).toBeTruthy()
    expect(screen.getByText('Jour 17')).toBeTruthy()
    expect(screen.queryByText('Jour 16')).toBeNull()
  })

  it('names the hidden count in the button label', () => {
    render(<FleetDayTable rows={mkRows(23)} />)
    expect(screen.getByRole('button', { name: 'Afficher plus (16 jours)' })).toBeTruthy()
  })

  it('reveals all rows on click and flips the label to "Afficher moins"', () => {
    render(<FleetDayTable rows={mkRows(23)} />)
    fireEvent.click(screen.getByRole('button', { name: /Afficher plus/ }))
    expect(screen.getAllByRole('row')).toHaveLength(24)
    expect(screen.getByText('Jour 1')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Afficher moins' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Afficher plus/ })).toBeNull()
  })

  it('collapses back to 7 rows when "Afficher moins" is clicked', () => {
    render(<FleetDayTable rows={mkRows(23)} />)
    fireEvent.click(screen.getByRole('button', { name: /Afficher plus/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Afficher moins' }))
    expect(screen.getAllByRole('row')).toHaveLength(8)
    expect(screen.getByRole('button', { name: 'Afficher plus (16 jours)' })).toBeTruthy()
  })

  it('renders no button when there are 5 rows — nothing hidden', () => {
    render(<FleetDayTable rows={mkRows(5)} />)
    expect(screen.getAllByRole('row')).toHaveLength(6)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders no button at the exact boundary of 7 rows', () => {
    render(<FleetDayTable rows={mkRows(7)} />)
    expect(screen.getAllByRole('row')).toHaveLength(8)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('uses the singular "jour" for exactly one hidden row', () => {
    render(<FleetDayTable rows={mkRows(8)} />)
    expect(screen.getByRole('button', { name: 'Afficher plus (1 jour)' })).toBeTruthy()
  })
})
