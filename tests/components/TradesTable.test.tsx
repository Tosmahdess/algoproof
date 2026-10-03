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
  // Refonte finition (2026-10-02): « 2 avr. », never « 02 avr. ».
  it('writes the day without a leading zero', () => {
    render(<TradesTable trades={trades} />)
    expect(screen.getAllByText('2 avr.').length).toBeGreaterThan(0)
    expect(screen.queryByText(/^0\d /)).toBeNull()
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

  // Refonte lot 3 (2026-10-02): rows read oldest to newest so the addition reads
  // downwards; the phone keeps the most recent ones, which are now the LAST rows.
  it('hides the older rows past the phone limit, below sm only', () => {
    render(<TradesTable trades={many} limiteMobile={5} />)
    // The limit lives on the phone list; the table (sm and up) shows every row.
    const items = [...screen.getByTestId('trades-list-mobile').querySelectorAll('li')]
    expect(items).toHaveLength(8)
    items.slice(0, 3).forEach(li => expect(li.className.split(/\s+/)).toContain('hidden'))
    items.slice(3).forEach(li => expect(li.className.split(/\s+/)).not.toContain('hidden'))
    // the newest trade (first in the list handed in) is the last row
    expect(items[7].textContent).toContain('A1/USDT')
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

// Refonte lot 3 (2026-10-02, audit 2026-10 section 10): the register lets a reader redo
// the addition. Result and cumul after each trade, the exit in words, a total row.
describe('TradesTable as a register', () => {
  const cumul = new Map([['1', 1023.4], ['2', 1015.2]])

  it('names its columns in words', () => {
    render(<TradesTable trades={trades} cumul={cumul} />)
    for (const name of ['Date', 'Actif', 'Résultat du trade', 'Cumul après ce trade', 'Motif de sortie']) {
      expect(screen.getByRole('columnheader', { name })).toBeInTheDocument()
    }
  })

  it('prints the cumul handed in, oldest row first', () => {
    render(<TradesTable trades={trades} cumul={cumul} />)
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows[0].textContent).toContain('SOL/USDT')
    expect(rows[0].textContent).toMatch(/1\s015,20\s€/)
    expect(rows[1].textContent).toMatch(/1\s023,40\s€/)
  })

  it('says the exit in words, not in codes', () => {
    const coded = [{ ...trades[0], reason: 'take_profit_2' }, { ...trades[1], reason: 'SL' }]
    render(<TradesTable trades={coded} />)
    expect(screen.getAllByText('Objectif 2')).toHaveLength(2)
    expect(screen.getAllByText('Stop')).toHaveLength(2)
    expect(screen.queryByText('TP2')).toBeNull()
  })

  it('a selection total is not presented as a balance', () => {
    render(<TradesTable trades={trades} cumul={cumul} total={{ label: 'Total de la sélection', sum: 15.2, cumul: null }} />)
    const total = screen.getByTestId('trades-total')
    expect(total.textContent).toMatch(/Total de la sélection/)
    expect(total.textContent).toMatch(/\+15,20\s€/)
    expect(total.textContent).not.toMatch(/1\s0\d\d,\d\d/)
  })
})
