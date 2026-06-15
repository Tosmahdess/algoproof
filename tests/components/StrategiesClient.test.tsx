import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import StrategiesClient from '@/components/StrategiesClient'
import type { BotWithStats } from '@/lib/types'

vi.mock('@/components/BotCard', () => ({
  default: ({ bot }: { bot: BotWithStats }) => (
    <div data-testid={`bot-${bot.slug}`} data-status={bot.status} data-family={bot.family}>
      {bot.name}
    </div>
  ),
}))

const makeBot = (overrides: Partial<BotWithStats>): BotWithStats => ({
  id: '1', slug: 'test', name: 'Test Bot', strategy: 'EMA', status: 'paper',
  family: 'trend', exchange: 'Binance', assets: [], timeframe: 'H4',
  description: null, created_at: '2026-01-01', last_sync_at: null,
  start_capital: 1000, promoted: false,
  stats: { win_rate: 0.6, profit_factor: 2.0, max_drawdown: 0.05, total_trades: 10, latest_capital: 1050 },
  perf_daily: [], recent_trades: [], all_trades: [],
  ...overrides,
})

const liveTrend    = makeBot({ id: '1', slug: 'v1-spot', name: 'V1 Spot', status: 'live', family: 'trend' })
const paperTrend   = makeBot({ id: '2', slug: 'ema-cross', name: 'EMA Cross', status: 'paper', family: 'trend' })
const paperBreakout = makeBot({ id: '3', slug: 'keltner', name: 'Keltner', status: 'paper', family: 'breakout' })
const bots = [liveTrend, paperTrend, paperBreakout]

describe('StrategiesClient', () => {
  it('shows live section when live bots exist', () => {
    render(<StrategiesClient bots={bots} />)
    expect(screen.getByText(/En direct/i)).toBeDefined()
    expect(screen.getByTestId('bot-v1-spot')).toBeDefined()
  })

  it('family filter shows only matching bots (AND logic)', () => {
    render(<StrategiesClient bots={bots} />)
    fireEvent.click(screen.getByRole('button', { name: /cassure/i }))
    expect(screen.getByTestId('bot-keltner')).toBeDefined()
    expect(screen.queryByTestId('bot-ema-cross')).toBeNull()
    // live bot is trend family, not breakout — hidden by AND logic
    expect(screen.queryByTestId('bot-v1-spot')).toBeNull()
  })

  it('status live filter shows only live bots', () => {
    render(<StrategiesClient bots={bots} />)
    fireEvent.click(screen.getByRole('button', { name: /^live$/i }))
    expect(screen.getByTestId('bot-v1-spot')).toBeDefined()
    expect(screen.queryByTestId('bot-ema-cross')).toBeNull()
    expect(screen.queryByTestId('bot-keltner')).toBeNull()
  })

  it('reset button clears both filters and shows all bots', () => {
    render(<StrategiesClient bots={bots} />)
    // live + cassure = 0 bots → triggers empty state with reset button
    fireEvent.click(screen.getByRole('button', { name: /^live$/i }))
    fireEvent.click(screen.getByRole('button', { name: /cassure/i }))
    expect(screen.getByRole('button', { name: /réinitialiser/i })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /réinitialiser/i }))
    expect(screen.getByTestId('bot-v1-spot')).toBeDefined()
    expect(screen.getByTestId('bot-ema-cross')).toBeDefined()
    expect(screen.getByTestId('bot-keltner')).toBeDefined()
  })
})
