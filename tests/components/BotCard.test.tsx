import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}))

import BotCard from '@/components/BotCard'
import { BotWithStats } from '@/lib/types'

const bot: BotWithStats = {
  id: '1', slug: 'v1-spot', name: 'Bot V1 Spot',
  strategy: 'EMA Cross H4', status: 'paper', family: 'trend',
  exchange: 'Binance Spot', assets: ['BTC/USDT'], timeframe: 'H4', description: null,
  stats: { win_rate: 0.52, profit_factor: 1.84, max_drawdown: 0.064, total_trades: 38, latest_capital: 1072 },
  perf_daily: [], recent_trades: [],
}

describe('BotCard', () => {
  it('renders bot name', () => {
    render(<BotCard bot={bot} />)
    expect(screen.getByText('Bot V1 Spot')).toBeInTheDocument()
  })
  it('links to strategy page', () => {
    render(<BotCard bot={bot} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/strategies/v1-spot')
  })
  it('shows win rate', () => {
    render(<BotCard bot={bot} />)
    expect(screen.getByText('52.0%')).toBeInTheDocument()
  })
})
