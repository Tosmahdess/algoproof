import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import OverviewClient from '@/components/OverviewClient'
import type { BotWithStats } from '@/lib/types'

vi.mock('@/components/MiBanner', () => ({ default: () => null }))

const mkBot = (slug: string, trades: number, wr: number, pf: number, dd: number, cap: number): BotWithStats => ({
  id: slug, slug, name: slug, strategy: '', status: 'paper', family: 'trend',
  exchange: 'Binance', assets: [], timeframe: 'H4', description: null, created_at: '', last_sync_at: null,
  start_capital: 1000,
  stats: { total_trades: trades, win_rate: wr, profit_factor: pf, max_drawdown: dd, latest_capital: cap },
  perf_daily: [], recent_trades: [], all_trades: [],
})

const BOTS: BotWithStats[] = [
  mkBot('alpha', 10, 0.50, 1.2, 0.05, 1050),
  mkBot('beta',   5, 0.40, 0.8, 0.10,  900),
  mkBot('gamma', 20, 0.70, 2.0, 0.02, 1100),
]

describe('OverviewClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => null }))
  })

  it('renders without crashing', () => {
    render(<OverviewClient bots={BOTS} recentTrades={[]} />)
    expect(screen.getAllByText('alpha').length).toBeGreaterThan(0)
  })

  it('shows ↓ sort indicator on P&L column by default', () => {
    render(<OverviewClient bots={BOTS} recentTrades={[]} />)
    const pnlBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('P&L'))
    expect(pnlBtn?.textContent).toContain('↓')
  })

  it('clicking Trades header activates ascending sort', () => {
    render(<OverviewClient bots={BOTS} recentTrades={[]} />)
    const tradesBtn = screen.getAllByRole('button').find(b => /^Trades/.test(b.textContent ?? ''))!
    fireEvent.click(tradesBtn)
    expect(tradesBtn.textContent).toContain('↑')
  })

  it('clicking active column header reverses direction', () => {
    render(<OverviewClient bots={BOTS} recentTrades={[]} />)
    const tradesBtn = screen.getAllByRole('button').find(b => /^Trades/.test(b.textContent ?? ''))!
    fireEvent.click(tradesBtn) // asc
    fireEvent.click(tradesBtn) // desc
    expect(tradesBtn.textContent).toContain('↓')
  })

  it('renders ↕ on inactive sortable columns', () => {
    render(<OverviewClient bots={BOTS} recentTrades={[]} />)
    const tradesBtn = screen.getAllByRole('button').find(b => /^Trades/.test(b.textContent ?? ''))!
    expect(tradesBtn.textContent).toContain('↕')
  })

  // Archived bots: stay VISIBLE in the table, but are excluded from every aggregate.
  const ARCHIVED = { ...mkBot('zeta-arch', 8, 0.5, 1.1, 0.05, 1200), status: 'archived' as const }

  it('still lists archived bots in the table', () => {
    render(<OverviewClient bots={[...BOTS, ARCHIVED]} recentTrades={[]} />)
    expect(screen.getAllByText('zeta-arch').length).toBeGreaterThan(0)
  })

  it('excludes archived bots from the "Bots actifs" counter', () => {
    render(<OverviewClient bots={[...BOTS, ARCHIVED]} recentTrades={[]} />)
    const counter = screen.getByText('Bots actifs').closest('div')!
    expect(counter.textContent).toContain('3')      // 3 active (non-archived) bots
    expect(counter.textContent).not.toContain('4')  // the archived one is not counted
  })

  it('excludes archived bots from all-time P&L (laboratoire cohort)', () => {
    // BOTS are all paper → laboratoire sum = +50 (alpha) -100 (beta) +100 (gamma) = +50.
    // archived zeta (+200) must not count.
    render(<OverviewClient bots={[...BOTS, ARCHIVED]} recentTrades={[]} />)
    const pnl = screen.getByText('P&L all-time').closest('div')!
    expect(pnl.textContent).toContain('+50.00€')    // shown under Laboratoire · simulation
    expect(pnl.textContent).not.toContain('250')    // would be +250 if archived counted
  })

  // Real money and laboratoire (simulation) must never be summed into one headline.
  // Live bot = real capital, paper bots = laboratoire; each is shown separately.
  const LIVE = { ...mkBot('orb-live', 12, 0.6, 1.5, 0.03, 1300), status: 'live' as const } // +300 real

  it('splits all-time P&L into real vs laboratoire and never fuses them', () => {
    render(<OverviewClient bots={[...BOTS, LIVE]} recentTrades={[]} />)
    const tile = screen.getByText('P&L all-time').closest('div')!
    expect(tile.textContent).toContain('Argent réel')
    expect(tile.textContent).toContain('+300.00€')     // live cohort only
    expect(tile.textContent).toContain('Laboratoire · simulation')
    expect(tile.textContent).toContain('+50.00€')       // paper cohort only
    expect(tile.textContent).not.toContain('+350.00€')  // never the fused sum
  })

  // Carry/portage bots (grid, funding-rate harvesting) have near-zero losing round-trips
  // by construction — PF/WR read as broken (PF 999.00, WR 100%) rather than a real edge.
  const CARRY_BOT = { ...mkBot('grid-btc-spot', 15, 1.0, 999, 0.01, 1150), family: 'carry' as const }

  // Both the mobile list (<a>) and desktop table (<tr>) render the bot name — scope to
  // the desktop <tr>, which is the only row exposing separate PF/WR cells.
  const desktopRow = (name: string) =>
    screen.getAllByText(name).map(el => el.closest('tr')).find((tr): tr is HTMLTableRowElement => tr !== null)!

  it('shows — instead of profit factor / win rate for carry-family bots', () => {
    render(<OverviewClient bots={[...BOTS, CARRY_BOT]} recentTrades={[]} />)
    const row = desktopRow('grid-btc-spot')
    expect(row.textContent).not.toContain('999.00')
    expect(row.textContent).not.toContain('100.0%')
    const dashCells = Array.from(row.querySelectorAll('td')).filter(td => td.textContent === '—')
    expect(dashCells.length).toBeGreaterThanOrEqual(2)
  })

  it('still shows a normal PF/WR for non-carry bots', () => {
    render(<OverviewClient bots={[...BOTS, CARRY_BOT]} recentTrades={[]} />)
    const row = desktopRow('gamma')
    expect(row.textContent).toContain('2.00')
    expect(row.textContent).toContain('70.0%')
  })
})
