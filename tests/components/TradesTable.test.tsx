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
    // Each trade renders twice: the phone list and the table from sm up.
    expect(screen.getAllByText('BTC/USDT')).toHaveLength(2)
    expect(screen.getAllByText('SOL/USDT')).toHaveLength(2)
  })
  it('renders positive pnl with + prefix', () => {
    render(<TradesTable trades={trades} />)
    expect(screen.getAllByText(/^\+23,40\s€$/)).toHaveLength(2)
  })
  it('renders negative pnl with - prefix', () => {
    render(<TradesTable trades={trades} />)
    expect(screen.getAllByText(/^−8,20\s€$/)).toHaveLength(2)
  })
  it('shows empty state when no trades', () => {
    render(<TradesTable trades={[]} />)
    expect(screen.getByText(/aucun trade/i)).toBeInTheDocument()
  })
})

// 2026-09-19 (D057): twenty rows took 1 263 px on a phone. Rows past the
// phone limit are hidden below sm only; a computer still sees all of them.
describe('TradesTable phone limit', () => {
  const many: Trade[] = Array.from({ length: 8 }, (_, i) => ({
    ...trades[0], id: String(i + 1), asset: `A${i + 1}/USDT`,
  }))

  it('hides rows past the phone limit below sm only', () => {
    render(<TradesTable trades={many} limiteMobile={5} />)
    // The limit lives on the phone list; the table (sm and up) shows every row.
    const items = [...screen.getByTestId('trades-list-mobile').querySelectorAll('li')]
    expect(items).toHaveLength(8)
    items.slice(0, 5).forEach(li => expect(li.className.split(/\s+/)).not.toContain('hidden'))
    items.slice(5).forEach(li => expect(li.className.split(/\s+/)).toContain('hidden'))
    const rows = screen.getAllByRole('row').slice(1)   // skip the header row
    expect(rows).toHaveLength(8)
    rows.forEach(r => expect(r.className.split(/\s+/)).not.toContain('hidden'))
  })

  it('hides nothing without a limit', () => {
    render(<TradesTable trades={many} />)
    const items = [...screen.getByTestId('trades-list-mobile').querySelectorAll('li')]
    items.forEach(li => expect(li.className.split(/\s+/)).not.toContain('hidden'))
  })
})
