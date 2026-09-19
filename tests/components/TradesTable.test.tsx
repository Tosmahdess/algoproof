import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import TradesTable from '@/components/TradesTable'
import { Trade } from '@/lib/types'

const trades: Trade[] = [
  { id: '1', bot_id: 'b1', opened_at: '2026-04-01T10:00:00Z', closed_at: '2026-04-02T14:00:00Z',
    asset: 'BTC/USDT', side: 'long', pnl: 23.4, reason: 'EMA cross', is_paper: true, entry_price: null, exit_price: null },
  { id: '2', bot_id: 'b1', opened_at: '2026-04-03T08:00:00Z', closed_at: '2026-04-03T20:00:00Z',
    asset: 'SOL/USDT', side: 'short', pnl: -8.2, reason: 'Stop loss', is_paper: true, entry_price: null, exit_price: null },
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

// 2026-09-19 (D056): twenty rows took 1 263 px on a phone. Rows past the
// phone limit are hidden below sm only; a computer still sees all of them.
describe('TradesTable phone limit', () => {
  const many: Trade[] = Array.from({ length: 8 }, (_, i) => ({
    ...trades[0], id: String(i + 1), asset: `A${i + 1}/USDT`,
  }))

  it('hides rows past the phone limit below sm only', () => {
    render(<TradesTable trades={many} limiteMobile={5} />)
    const rows = screen.getAllByRole('row').slice(1)   // skip the header row
    expect(rows).toHaveLength(8)
    rows.slice(0, 5).forEach(r => expect(r.className).not.toContain('max-sm:hidden'))
    rows.slice(5).forEach(r => expect(r.className).toContain('max-sm:hidden'))
    rows.forEach(r => expect(r.className.split(/\s+/)).not.toContain('hidden'))
  })

  it('hides nothing without a limit', () => {
    render(<TradesTable trades={many} />)
    screen.getAllByRole('row').slice(1).forEach(r => expect(r.className).not.toContain('max-sm:hidden'))
  })
})
