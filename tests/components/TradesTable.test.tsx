import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import TradesTable from '@/components/TradesTable'
import { Trade } from '@/lib/types'

const trades: Trade[] = [
  { id: '1', bot_id: 'b1', opened_at: '2026-04-01T10:00:00Z', closed_at: '2026-04-02T14:00:00Z',
    asset: 'BTC/USDT', side: 'long', pnl: 23.4, reason: 'EMA cross', is_paper: true },
  { id: '2', bot_id: 'b1', opened_at: '2026-04-03T08:00:00Z', closed_at: '2026-04-03T20:00:00Z',
    asset: 'SOL/USDT', side: 'short', pnl: -8.2, reason: 'Stop loss', is_paper: true },
]

describe('TradesTable', () => {
  it('renders asset names', () => {
    render(<TradesTable trades={trades} />)
    expect(screen.getByText('BTC/USDT')).toBeInTheDocument()
    expect(screen.getByText('SOL/USDT')).toBeInTheDocument()
  })
  it('renders positive pnl with + prefix', () => {
    render(<TradesTable trades={trades} />)
    expect(screen.getByText('+23.40')).toBeInTheDocument()
  })
  it('renders negative pnl with - prefix', () => {
    render(<TradesTable trades={trades} />)
    expect(screen.getByText('-8.20')).toBeInTheDocument()
  })
  it('shows empty state when no trades', () => {
    render(<TradesTable trades={[]} />)
    expect(screen.getByText(/aucun trade/i)).toBeInTheDocument()
  })
})
