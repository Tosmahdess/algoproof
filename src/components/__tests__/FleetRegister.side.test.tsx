// The side pills must change what the rows SHOW, not just the URL. The old
// `direction` parameter failed exactly this (bot-filters.ts header): it
// round-tripped and rendered nothing. This test clicks « Short » and reads
// the trade count cell of a known row.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { mkBot } from '../../../tests/fixtures/bots'
import { EMPTY_FILTERS } from '@/lib/bot-filters'
import type { Trade } from '@/lib/types'

vi.mock('next/navigation', () => ({
  usePathname: () => '/overview',
}))

import FleetRegister from '@/components/FleetRegister'

const t = (id: string, side: 'long' | 'short', pnl: number): Trade => ({
  id, bot_id: 'x', opened_at: '2026-05-01T00:00:00Z', closed_at: `2026-05-0${id}T01:00:00Z`,
  asset: 'BTC/USDT', side, pnl, reason: null, is_paper: true, entry_price: null, exit_price: null,
})

// mkBot takes Partial<BotWithStats>, so `stats` must be a FULL BotStats.
const alpha = mkBot({
  name: 'Alpha Slice Bot',
  stats: { win_rate: 1, profit_factor: 999, max_drawdown: 0, total_trades: 3, latest_capital: 1030 },
  all_trades: [t('1', 'long', 10), t('2', 'long', 15), t('3', 'short', 5)],
})
const beta = mkBot({
  name: 'Beta Longs Only',
  stats: { win_rate: 1, profit_factor: 999, max_drawdown: 0, total_trades: 2, latest_capital: 1020 },
  all_trades: [t('1', 'long', 10), t('2', 'long', 10)],
})

// BotTable renders each bot twice — a mobile card list and the table — so
// the name is not unique; the row is the occurrence that lives in a <tr>.
function rowOf(name: string): HTMLElement {
  const rows = screen.getAllByText(name).map(el => el.closest('tr')).filter((r): r is HTMLTableRowElement => r !== null)
  if (rows.length !== 1) throw new Error(`expected one <tr> for ${name}, got ${rows.length}`)
  return rows[0]
}

describe('FleetRegister — side slice', () => {
  it('shows server stats by default and the short slice after clicking « Short »', () => {
    render(<FleetRegister bots={[alpha, beta]} initialState={EMPTY_FILTERS} />)
    // Filters live in a closed <details>; open it.
    fireEvent.click(screen.getByText(/Filtrer la flotte/))

    // BotTable appends ' ⚠' to a count under 20 trades (isLowSample), as two
    // adjacent text nodes — match the whole cell text, marker optional.
    expect(within(rowOf('Alpha Slice Bot')).getByText(/^3( ⚠)?$/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^Short \(/ }))

    // Alpha: 1 short. Beta: none → « — » in the stats cells, still listed.
    expect(within(rowOf('Alpha Slice Bot')).getByText(/^1( ⚠)?$/)).toBeInTheDocument()
    expect(rowOf('Beta Longs Only')).toBeInTheDocument()
    expect(within(rowOf('Beta Longs Only')).getAllByText('—').length).toBeGreaterThan(0)
    // The pill counts bots with ≥1 short: only Alpha.
    expect(screen.getByRole('button', { name: /^Short \(1\)/ })).toHaveAttribute('aria-pressed', 'true')
    expect(window.location.search).toContain('side=short')
  })

  it('clicking the active side pill returns to all', () => {
    render(<FleetRegister bots={[alpha, beta]} initialState={{ ...EMPTY_FILTERS, side: 'short' }} />)
    fireEvent.click(screen.getByText(/Filtrer la flotte/))
    fireEvent.click(screen.getByRole('button', { name: /^Short \(/ }))
    expect(within(rowOf('Alpha Slice Bot')).getByText(/^3( ⚠)?$/)).toBeInTheDocument()
    expect(window.location.search).not.toContain('side=')
  })
})
