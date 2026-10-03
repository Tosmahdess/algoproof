import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ComplianceChecklist from '@/components/ComplianceChecklist'

describe('ComplianceChecklist', () => {
  it('renders all four compliance items', () => {
    render(<ComplianceChecklist />)
    expect(screen.getAllByRole('listitem').length).toBe(4)
    expect(screen.getByText(/plateforme agréée/i)).toBeTruthy()
    expect(screen.getByText(/3916/i)).toBeTruthy()
  })

  // Refonte de /mica (2026-10-03): the four checkboxes remembered nothing and
  // struck the line through when ticked (audit 2026-10: « cases à cocher », a
  // generic page). The list is now four lines of a register, each with its reason;
  // the former « toggles an item » test went with the checkbox it described.
  it('is a plain list, with no checkbox', () => {
    render(<ComplianceChecklist />)
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })
})
