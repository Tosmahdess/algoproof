import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PathToRealCard from '@/components/PathToRealCard'

const stats = { win_rate: 0.38, profit_factor: 1.42, max_drawdown: 0.062, total_trades: 17, latest_capital: 1000 }

describe('PathToRealCard', () => {
  // Refonte lot 3 (2026-10-02): the four gauges became four rows, a value against its
  // threshold like the rules beside them, and the count reads in words.
  it('paper bot: renders 4 criteria + criteria count', () => {
    render(<PathToRealCard status="paper" stats={stats} />)
    expect(screen.getByText(/avant le moindre euro réel/i)).toBeInTheDocument()
    expect(screen.getAllByTestId('ptr-row')).toHaveLength(4)
    expect(screen.getByText(/2 critères sur 4 atteints/i)).toBeInTheDocument()
  })
  it('writes French figures, never « 1.42 » or a green tick', () => {
    const { container } = render(<PathToRealCard status="paper" stats={stats} />)
    expect(container.textContent).toMatch(/1,42/)
    expect(container.textContent).not.toMatch(/\d\.\d|✓/)
  })
  // Audit 2026-10, constat 6: no trade, nothing measured, nothing validated.
  it('zero trade: « — » and « pas encore mesurable », no criterion met', () => {
    const { container } = render(<PathToRealCard status="paper"
      stats={{ ...stats, total_trades: 0, profit_factor: 0, win_rate: 0, max_drawdown: 0 }} />)
    expect(screen.getAllByText('pas encore mesurable')).toHaveLength(3)
    expect(screen.getAllByText('—')).toHaveLength(3)
    expect(container.textContent).toMatch(/0 critère sur 4 atteint/)
    expect(container.innerHTML).not.toMatch(/text-positive|text-negative/)
  })
  // 2026-09-19 (D057): a live bot rendered a 55 px card repeating « En argent
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
