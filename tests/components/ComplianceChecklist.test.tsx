import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ComplianceChecklist from '@/components/ComplianceChecklist'

describe('ComplianceChecklist', () => {
  it('renders all four compliance items', () => {
    render(<ComplianceChecklist />)
    expect(screen.getAllByRole('checkbox').length).toBe(4)
    expect(screen.getByText(/exchange agréé/i)).toBeTruthy()
    expect(screen.getByText(/3916/i)).toBeTruthy()
  })
  it('toggles an item when clicked', () => {
    render(<ComplianceChecklist />)
    const first = screen.getAllByRole('checkbox')[0] as HTMLInputElement
    expect(first.checked).toBe(false)
    fireEvent.click(first)
    expect(first.checked).toBe(true)
  })
})
