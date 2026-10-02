// tests/components/StrategyDetailSegment.test.tsx
//
// User, 2026-09-29: next to « Départ : 1 000 € le 1er janvier », the curve header showed the
// simulation's +0,9 %, which reads as the whole curve's result. The header gives the result
// since 1 January; the simulation's own result comes second, named.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import StrategyDetail from '@/components/StrategyDetail'
import { buildTimeline, type BacktestSegment } from '@/lib/backtest-segment'
import type { BotWithStats, PerfDaily, Trade } from '@/lib/types'

const seg: BacktestSegment = {
  slug: 'arm-test', startDate: '2026-01-01', freezeDate: '2026-08-01', replayEnd: '2026-08-21',
  startCapital: 1000,
  points: [{ date: '2026-01-01', capital: 1000 }, { date: '2026-08-01', capital: 1100 },
    { date: '2026-08-21', capital: 1100 }],
  trades: [{ asset: 'ETH-USDT', side: 'long', opened_at: '2026-02-01', closed_at: '2026-02-03',
    entry_price: 1, exit_price: 1.1, reason: 'tp_hit', pnl: 100 }],
}

const trade: Trade = {
  id: 't1', bot_id: 'arm-test', opened_at: '2026-09-01T00:00:00+00:00',
  closed_at: '2026-09-02T00:00:00+00:00', asset: 'ETH-USDT', side: 'long', pnl: 10,
  reason: 'tp_hit', is_paper: true, entry_price: 1, exit_price: 1.1,
}
const perf: PerfDaily[] = [{ id: 'p', bot_id: 'arm-test', date: '2026-09-02', capital: 1010,
  pnl_day: 10, win_rate: null, profit_factor: null }]

const bot = {
  slug: 'arm-test', status: 'paper', family: null, start_capital: 1000,
  stats: { win_rate: 1, profit_factor: 999, max_drawdown: 0, total_trades: 1, latest_capital: 1010 },
  perf_daily: perf, recent_trades: [trade], all_trades: [trade],
} as unknown as BotWithStats

// what the page computes once and passes down (lib/bot-simulation.ts)
const simulation = () => {
  const timeline = buildTimeline(seg, perf, [trade], 1000)!
  return { segment: seg, timeline, stats: timeline.simStats }
}

// Refonte lot 3 (2026-10-02, audit 2026-10 constat 4): the order is reversed. The
// simulation alone leads, in colour; the result since 1 January, backtest included, is a
// grey line apart that names the backtest's share.
describe('StrategyDetail curve header with a backtest segment', () => {
  it('leads with the simulation alone, the backtest apart and grey', () => {
    const { getByTestId } = render(<StrategyDetail bot={bot} simulation={simulation()} />)
    // the simulation alone: +11 € on the 1100 it started from
    expect(getByTestId('curve-result').textContent).toMatch(/^\+11,00\s€ \(\+1,0\s%\)$/)
    // curve ends at 1100 + 10 x 1.1 = 1111: +111 € since 1 January, of which +100 backtest
    const apart = getByTestId('curve-backtest')
    expect(apart.textContent).toMatch(/Depuis 1\s000,00\s€ le 1er janvier, backtest compris : \+111,00\s€, dont backtest \+100,00\s€/)
    expect(apart.className).toContain('text-muted')
  })
})

describe('StrategyDetail counter with replay trades after the freeze', () => {
  it('counts the simulation trades at the top, not the ledger alone', () => {
    // a bridge trade (after the 1 August freeze, before the launch) + the ledger trade
    const bridged = { ...seg, trades: [...seg.trades, { asset: 'OP-USDT', side: 'short' as const,
      opened_at: '2026-08-05', closed_at: '2026-08-07', entry_price: 1, exit_price: 0.9,
      reason: 'tp_hit', pnl: 0 }] }
    const timeline = buildTimeline(bridged, perf, [trade], 1000)!
    const t = render(<StrategyDetail bot={bot}
      simulation={{ segment: bridged, timeline, stats: timeline.simStats }} />)
      .container.textContent!.replace(/\s+/g, ' ')
    // Refonte lot 3: the sides in words (« 1L · 1S » before).
    expect(t).toMatch(/2 trades clos · 1 long · 1 short/)
  })
})
