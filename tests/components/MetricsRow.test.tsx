import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import MetricsRow from '@/components/MetricsRow'

const stats = { win_rate: 0.52, profit_factor: 1.84, max_drawdown: 0.064, total_trades: 38, latest_capital: 1072 }

describe('MetricsRow', () => {
  it('renders win rate as percentage', () => {
    render(<MetricsRow stats={stats} />)
    expect(screen.getByText(/52,0 %/)).toBeInTheDocument()
  })
  it('renders profit factor', () => {
    render(<MetricsRow stats={stats} />)
    expect(screen.getByText('1,84')).toBeInTheDocument()
  })
  it('renders max drawdown as percentage', () => {
    render(<MetricsRow stats={stats} />)
    expect(screen.getByText(/6,4 %/)).toBeInTheDocument()
  })
  it('renders trade count', () => {
    render(<MetricsRow stats={stats} />)
    expect(screen.getByText('38')).toBeInTheDocument()
  })
})

// Lot 5 of the design audit (2026-09-25, conception §5.6): the four metrics are
// tiles (label muted, figure in mono on the card-2 surface), and the low-sample
// sentence is words, not a warning glyph.
describe('MetricsRow — tiles', () => {
  it('renders four tiles on the card-2 surface, figures in mono', () => {
    const { container } = render(<MetricsRow stats={stats} />)
    const tiles = container.querySelectorAll('[data-testid="stat-tile"]')
    expect(tiles).toHaveLength(4)
    for (const t of tiles) {
      expect(t.className).toMatch(/bg-card-2/)
      expect(t.querySelector('.font-mono')).not.toBeNull()
    }
  })

  it('says a small sample in words, without a glyph', () => {
    const { container } = render(<MetricsRow stats={{ ...stats, total_trades: 7 }} />)
    expect(container.textContent).toMatch(/Échantillon faible/)
    expect(container.textContent).not.toMatch(/⚠/)
  })
})
