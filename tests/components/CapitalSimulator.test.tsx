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
    expect(screen.getByText(/\+20,00 €/)).toBeInTheDocument()
    // worst month −60 → −30 ; max drawdown (peak 1050 → 990) −60 → −30 too
    expect(screen.getAllByText(/−30,00 €/)).toHaveLength(2)
  })

  it('rescales when another preset is clicked', () => {
    render(<CapitalSimulator perfDaily={perf} startCapital={1000} />)
    fireEvent.click(screen.getByText('2500 €'))
    expect(screen.getByText(/\+100,00 €/)).toBeInTheDocument()
  })

  it('carries the non-projection disclaimer', () => {
    render(<CapitalSimulator perfDaily={perf} startCapital={1000} />)
    expect(screen.getByText(/pas une\s*projection/)).toBeInTheDocument()
    expect(screen.getByText(/conseil en investissement/)).toBeInTheDocument()
  })

  it('writes the period in French dates read from the data', () => {
    render(<CapitalSimulator perfDaily={perf} startCapital={1000} />)
    expect(screen.getByText(/du 10 janvier au 10 mars 2026/)).toBeInTheDocument()
    expect(screen.queryByText(/2026-01-10/)).toBeNull()
  })

  it('reads a backtest curve from 1 January and says which part is backtest', () => {
    // backtest 1000 -> 1050 by 31 January, then the simulation gains 10 more
    const curve = [pd('2026-01-01', 1000, 0), pd('2026-01-31', 1050, 50), pd('2026-02-15', 1060, 10)]
    const t = render(<CapitalSimulator perfDaily={curve} startCapital={1000}
      backtestUntil="2026-01-31" backtestEndCapital={1050} />).container.textContent!.replace(/\s+/g, ' ')
    expect(t).toContain('du 1er janvier au 15 février 2026')
    expect(t).toMatch(/Résultat depuis le 1er janvier/)
    // 500 € preset: +60 on 1000 -> +30, of which +25 is the backtest
    expect(t).toMatch(/\+30,00\s€/)
    expect(t).toMatch(/dont \+25,00\s€ de backtest/)
    expect(t).toMatch(/déjà vues/)
  })

  it('renders nothing without history', () => {
    const { container } = render(<CapitalSimulator perfDaily={[]} startCapital={1000} />)
    expect(container).toBeEmptyDOMElement()
  })
})
