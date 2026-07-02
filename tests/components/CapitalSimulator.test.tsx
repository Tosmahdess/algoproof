import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CapitalSimulator from '@/components/CapitalSimulator'
import type { PerfDaily } from '@/lib/types'

const pd = (date: string, capital: number, pnl_day: number): PerfDaily => ({
  id: date, bot_id: 'b', date, capital, pnl_day, win_rate: null, profit_factor: null,
})

const perf = [
  pd('2026-01-10', 1050, 50),
  pd('2026-02-10', 990, -60),
  pd('2026-03-10', 1040, 50),
]

describe('CapitalSimulator', () => {
  it('renders scaled results at the default 500 € preset', () => {
    render(<CapitalSimulator perfDaily={perf} startCapital={1000} />)
    // +40 on 1000 → +20 on 500
    expect(screen.getByText('+20.00€')).toBeInTheDocument()
    // worst month −60 → −30 ; max drawdown (peak 1050 → 990) −60 → −30 too
    expect(screen.getAllByText('-30.00€')).toHaveLength(2)
  })

  it('rescales when another preset is clicked', () => {
    render(<CapitalSimulator perfDaily={perf} startCapital={1000} />)
    fireEvent.click(screen.getByText('2500 €'))
    expect(screen.getByText('+100.00€')).toBeInTheDocument()
  })

  it('carries the non-projection disclaimer', () => {
    render(<CapitalSimulator perfDaily={perf} startCapital={1000} />)
    expect(screen.getByText(/pas une\s*projection/)).toBeInTheDocument()
    expect(screen.getByText(/conseil en investissement/)).toBeInTheDocument()
  })

  it('renders nothing without history', () => {
    const { container } = render(<CapitalSimulator perfDaily={[]} startCapital={1000} />)
    expect(container).toBeEmptyDOMElement()
  })
})
