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
  // Refonte registre, lot 3 (2026-10-02): the tiles on a card became a register row, four
  // figures between rules (nested cards are out). Figures stay tabular, never mono.
  it('renders four figures in a register row, in tabular figures', () => {
    const { container } = render(<MetricsRow stats={stats} />)
    const tiles = container.querySelectorAll('[data-testid="stat-tile"]')
    expect(tiles).toHaveLength(4)
    for (const t of tiles) {
      expect(t.className).not.toMatch(/bg-card/)
      expect(t.querySelector('.tabular-nums')).not.toBeNull()
      expect(t.querySelector('.font-mono')).toBeNull()
    }
  })

  it('says a small sample in words, without a glyph', () => {
    const { container } = render(<MetricsRow stats={{ ...stats, total_trades: 7 }} />)
    expect(container.textContent).toMatch(/Échantillon faible/)
    expect(container.textContent).not.toMatch(/⚠/)
  })
})

// Audit 2026-10. Constat 30: on the fiche the drawdown takes the colour of its published
// limit, or none. Constat 6: without a trade, « — » everywhere and nothing coloured.
describe('MetricsRow on the fiche', () => {
  it('colours the drawdown by its threshold when the fiche says so', () => {
    const dd = (tone: 'breach' | 'watch' | 'neutral') => {
      const { unmount } = render(<MetricsRow stats={stats} drawdownTone={tone} />)
      const cls = screen.getByText(/6,4 %/).className
      unmount()
      return cls
    }
    expect(dd('breach')).toContain('text-negative')
    expect(dd('watch')).toContain('text-warning')
    expect(dd('neutral')).not.toMatch(/text-negative|text-warning/)
  })

  it('zero trade: dashes, no colour', () => {
    const { container } = render(<MetricsRow stats={{ ...stats, total_trades: 0, win_rate: 0, profit_factor: 0, max_drawdown: 0 }} />)
    expect(screen.getAllByText('—')).toHaveLength(3)
    expect(container.innerHTML).not.toMatch(/text-negative|text-positive|text-warning/)
  })
})
