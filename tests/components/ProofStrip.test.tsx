import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProofStrip from '@/components/ProofStrip'

const proof = { nBots: 33, nWithData: 22, totalTrades: 1692, losingTrades: 740, fleetPnl: 396, fleetPF: 1.32 }
// fr-FR toLocaleString uses a narrow no-break space (U+202F) for thousands; strip all spaces before comparing.
const noSpace = (s: string | null | undefined) => (s ?? '').replace(/\s/gu, '')

describe('ProofStrip', () => {
  it('renders the three transparency numbers (no profit/P&L)', () => {
    render(<ProofStrip proof={proof} />)
    expect(noSpace(screen.getByTestId('proof-trades').textContent)).toBe('1692')
    expect(screen.getByTestId('proof-losses').textContent).toBe('740')
    expect(screen.getByTestId('proof-bots').textContent).toBe('22')
  })

  it('does not surface money figures', () => {
    render(<ProofStrip proof={proof} />)
    expect(screen.queryByText(/€/)).toBeNull()
    expect(screen.queryByText(/profit factor/i)).toBeNull()
  })

  it('links to /performance and /overview', () => {
    render(<ProofStrip proof={proof} />)
    const hrefs = screen.getAllByRole('link').map(l => l.getAttribute('href'))
    expect(hrefs).toContain('/performance')
    expect(hrefs).toContain('/overview')
  })
})
