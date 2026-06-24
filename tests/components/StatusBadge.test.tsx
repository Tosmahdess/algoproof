import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import StatusBadge from '@/components/StatusBadge'

describe('StatusBadge', () => {
  it('renders paper status', () => {
    render(<StatusBadge status="paper" />)
    expect(screen.getByText(/paper/i)).toBeInTheDocument()
  })
  it('renders live status', () => {
    render(<StatusBadge status="live" />)
    expect(screen.getByText(/live/i)).toBeInTheDocument()
  })
  it('renders backtest status', () => {
    render(<StatusBadge status="backtest" />)
    expect(screen.getByText(/backtest/i)).toBeInTheDocument()
  })
  it('renders archived status', () => {
    render(<StatusBadge status="archived" />)
    expect(screen.getByText(/archiv/i)).toBeInTheDocument()
  })
})
