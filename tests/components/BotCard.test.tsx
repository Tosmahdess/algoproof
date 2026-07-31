import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}))

import BotCard from '@/components/BotCard'
import { BotWithStats } from '@/lib/types'

const bot: BotWithStats = {
  id: '1', slug: 'v1-spot', name: 'Bot V1 Spot',
  // verbatim production value for v1-spot (see tests/fixtures/bots.ts)
  strategy: 'EMA Cross H4 (21/55/200)', status: 'paper', family: 'trend',
  exchange: 'Binance Spot', venue: 'binance-spot', assets: ['BTC/USDT'], timeframe: 'H4', description: null, created_at: '2026-01-01T00:00:00Z', last_sync_at: null,
  start_capital: 1000,
  origin: 'engine', found_at: null, validated_at: null, paper_since: null, live_since: null,
  frozen_at: null, archived_at: null, engine_unit_key: null, rejudge_status: 'not_needed',
  stats: { win_rate: 0.52, profit_factor: 1.84, max_drawdown: 0.064, total_trades: 38, latest_capital: 1072 },
  perf_daily: [], recent_trades: [], all_trades: [],
}

describe('BotCard', () => {
  it('renders bot name', () => {
    render(<BotCard bot={bot} />)
    expect(screen.getByText('Bot V1 Spot')).toBeInTheDocument()
  })
  it('links to strategy page', () => {
    render(<BotCard bot={bot} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/strategies/bot/v1-spot')
  })
  it('shows win rate', () => {
    render(<BotCard bot={bot} />)
    expect(screen.getByText('52.0%')).toBeInTheDocument()
  })
})
