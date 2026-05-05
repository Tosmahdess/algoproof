import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import MetricsRow from '@/components/MetricsRow'

const stats = { win_rate: 0.52, profit_factor: 1.84, max_drawdown: 0.064, total_trades: 38, latest_capital: 1072 }

describe('MetricsRow', () => {
  it('renders win rate as percentage', () => {
    render(<MetricsRow stats={stats} />)
    expect(screen.getByText('52.0%')).toBeInTheDocument()
  })
  it('renders profit factor', () => {
    render(<MetricsRow stats={stats} />)
    expect(screen.getByText('1.84')).toBeInTheDocument()
  })
  it('renders max drawdown as percentage', () => {
    render(<MetricsRow stats={stats} />)
    expect(screen.getByText('6.4%')).toBeInTheDocument()
  })
  it('renders trade count', () => {
    render(<MetricsRow stats={stats} />)
    expect(screen.getByText('38')).toBeInTheDocument()
  })
})
