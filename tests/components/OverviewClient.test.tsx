import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import OverviewClient from '@/components/OverviewClient'
import type { BotWithStats } from '@/lib/types'

vi.mock('@/components/MiBanner', () => ({ default: () => null }))

const mkBot = (
  slug: string, trades: number, wr: number, pf: number, dd: number, cap: number,
  opts: { status?: BotWithStats['status']; promoted?: boolean } = {},
): BotWithStats => ({
  id: slug, slug, name: slug, strategy: '', status: opts.status ?? 'paper', family: 'trend',
  exchange: 'Binance', assets: [], timeframe: 'H4', description: null, created_at: '', last_sync_at: null,
  start_capital: 1000, promoted: opts.promoted ?? false,
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
})
