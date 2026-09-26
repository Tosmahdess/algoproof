import { describe, it, expect } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import FleetJournal from '@/components/FleetJournal'
import type { DayRow } from '@/lib/fleet-aggregate'

// Lot 4 (conception §5.2): the day-by-day journal folds, on every screen, under
// one line that says how many days it holds. It used to sit open inside « Le
// bilan », 449 px before the register on a phone.
const rows: DayRow[] = Array.from({ length: 9 }, (_, i) => ({
  date: `2026-09-${String(20 - i).padStart(2, '0')}`,
  dateFr: `${20 - i}/9/2026`,
  trades: 10 + i,
  pnlReal: i % 2 ? -1.5 : 2.25,
  pnlLabo: 3.5,
}))

describe('FleetJournal', () => {
  it('folds the day table under a title that counts the days', () => {
    render(<FleetJournal rows={rows} />)
    const section = screen.getByTestId('fleet-journal')
    const toggle = within(section).getByRole('button', { name: /Jour par jour/ })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(toggle.textContent).toMatch(/9 jours/)
    // The table is in the document for search engines and print, hidden until opened.
    const table = within(section).getByTestId('fleet-balance-table')
    expect(table.closest('[hidden], .hidden')).not.toBeNull()
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(table.closest('.hidden')).toBeNull()
  })

  it('renders nothing without a single day', () => {
    const { container } = render(<FleetJournal rows={[]} />)
    expect(container.innerHTML).toBe('')
  })
})
