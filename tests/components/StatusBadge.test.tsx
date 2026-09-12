import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import StatusBadge from '@/components/StatusBadge'

// Labels renamed 2026-09-10 (pre-launch audit): « Paper trading » → « Simulation »,
// « Live » → « Argent réel », the words of the site's balance sheet. The
// form/colour rules live in tests/app/status-on-every-row.test.tsx.
describe('StatusBadge', () => {
  it('renders paper status as « Simulation »', () => {
    render(<StatusBadge status="paper" />)
    expect(screen.getByText(/simulation/i)).toBeInTheDocument()
  })
  it('renders live status as « Argent réel »', () => {
    render(<StatusBadge status="live" />)
    expect(screen.getByText(/argent réel/i)).toBeInTheDocument()
  })
  it('renders backtest status', () => {
    render(<StatusBadge status="backtest" />)
    expect(screen.getByText(/backtest/i)).toBeInTheDocument()
  })
  it('renders archived status', () => {
    render(<StatusBadge status="archived" />)
    expect(screen.getByText(/archiv/i)).toBeInTheDocument()
  })
  it('never says « Live » or « Paper » any more, the two words the site retired', () => {
    for (const status of ['paper', 'live', 'backtest', 'frozen', 'archived'] as const) {
      const { container, unmount } = render(<StatusBadge status={status} />)
      expect(container.textContent).not.toMatch(/\bLive\b|\bPaper\b/)
      unmount()
    }
  })
})
