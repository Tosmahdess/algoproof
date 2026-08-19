// src/components/__tests__/BotTable.test.tsx
import { test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import BotTable from '../BotTable'
import type { BotWithStats } from '@/lib/types'

// Fixture is a full BotWithStats: the brief's original fixture only carried the fields the
// home markup reads, but BotTable's prop type is the real BotWithStats (Bot + stats +
// perf_daily/recent_trades/all_trades) so strict tsc holds it to every required field.
// Widened here rather than loosening the component's contract to a partial type.
const bot = (over: Partial<BotWithStats> = {}): BotWithStats => ({
  id: '1', slug: 'arm-hmacross-h4-head00', name: 'Croisement HMA H4 — moteur · grappe 00',
  strategy: 'hmacross', family: 'trend', status: 'paper', exchange: 'Binance Futures',
  venue: null, assets: [], timeframe: 'H4', description: null,
  created_at: '2026-01-01T00:00:00Z', last_sync_at: null, start_capital: 1000,
  origin: 'engine', found_at: null, validated_at: null, paper_since: null, live_since: null,
  frozen_at: null, archived_at: null, engine_unit_key: null, rejudge_status: 'not_needed',
  stats: { total_trades: 0, win_rate: 0, profit_factor: 0, max_drawdown: 0, latest_capital: 1000 },
  perf_daily: [], recent_trades: [], all_trades: [],
  ...over,
})

test('a zero-trade bot renders an em-dash row, not zeros', () => {
  render(<BotTable bots={[bot()]} showTf={false} />)
  // getAllByText, not getByText: the component always renders BOTH the mobile list and
  // the desktop table (same as the home markup it's transposed from), toggled by CSS
  // media queries alone — jsdom doesn't evaluate those, so the bot name is present twice.
  expect(screen.getAllByText('Croisement HMA H4 — moteur · grappe 00').length).toBeGreaterThan(0)
  expect(screen.getAllByText('—').length).toBeGreaterThan(0)
})

test('the TF column renders only when asked', () => {
  const { rerender } = render(<BotTable bots={[bot()]} showTf />)
  expect(screen.getAllByText('H4').length).toBeGreaterThan(0)
  rerender(<BotTable bots={[bot()]} showTf={false} />)
  // TF still appears in the name/subtitle, but not as its own header
  expect(screen.queryByRole('columnheader', { name: 'TF' })).toBeNull()
})

test('every row links to the bot fiche', () => {
  render(<BotTable bots={[bot()]} showTf={false} />)
  const links = screen.getAllByRole('link')
  expect(links.some(l => l.getAttribute('href') === '/strategies/bot/arm-hmacross-h4-head00')).toBe(true)
})
