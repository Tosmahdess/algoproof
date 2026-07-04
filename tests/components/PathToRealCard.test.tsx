import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PathToRealCard from '@/components/PathToRealCard'

const stats = { win_rate: 0.38, profit_factor: 1.42, max_drawdown: 0.062, total_trades: 17, latest_capital: 1000 }

describe('PathToRealCard', () => {
  it('paper bot: renders 4 gauges + criteria count', () => {
    render(<PathToRealCard status="paper" stats={stats} />)
    expect(screen.getByText(/avant le moindre euro réel/i)).toBeInTheDocument()
    expect(screen.getAllByTestId('ptr-bar')).toHaveLength(4)
    expect(screen.getByText(/2\/4 critères atteints/i)).toBeInTheDocument()
  })
  it('live bot with liveSince: single line, no gauges', () => {
    render(<PathToRealCard status="live" stats={stats} liveSince="2026-06-17" />)
    expect(screen.getByText(/en argent réel depuis le 17\/06\/2026/i)).toBeInTheDocument()
    expect(screen.queryAllByTestId('ptr-bar')).toHaveLength(0)
  })
  it('live without liveSince, or archived: renders nothing', () => {
    const a = render(<PathToRealCard status="live" stats={stats} />)
    expect(a.container.firstChild).toBeNull()
    const b = render(<PathToRealCard status="archived" stats={stats} />)
    expect(b.container.firstChild).toBeNull()
  })
})
