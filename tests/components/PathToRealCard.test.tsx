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
  // 2026-09-19 (D056): a live bot rendered a 55 px card repeating « En argent
  // réel depuis le … », already on the provenance line of the same fiche,
  // from the same column. The card now renders nothing for a live bot.
  it('live bot: renders nothing, the provenance line carries the date', () => {
    const a = render(<PathToRealCard status="live" stats={stats} />)
    expect(a.container.firstChild).toBeNull()
  })
  it('archived: renders nothing', () => {
    const b = render(<PathToRealCard status="archived" stats={stats} />)
    expect(b.container.firstChild).toBeNull()
  })
})
