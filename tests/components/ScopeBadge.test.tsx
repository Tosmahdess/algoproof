import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ScopeBadge from '@/components/ScopeBadge'

describe('ScopeBadge', () => {
  it('renders fleet label', () => {
    render(<ScopeBadge scope="fleet" />)
    expect(screen.getByText('Flotte')).toBeTruthy()
  })
  it('renders a custom label override (bot slug)', () => {
    render(<ScopeBadge scope="bot" label="v1-spot" />)
    expect(screen.getByText('v1-spot')).toBeTruthy()
  })
})
