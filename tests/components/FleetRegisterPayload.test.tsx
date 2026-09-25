import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import FleetOverview from '@/components/FleetOverview'
import { computeFleetAggregate } from '@/lib/fleet-aggregate'
import { EMPTY_FILTERS } from '@/lib/bot-filters'
import { mkBot } from '../fixtures/bots'
import type { BotWithStats, Trade } from '@/lib/types'

// `/overview` measured in production on 2026-09-23: 5.92 MB of HTML, 96 % of it
// ONE inline RSC script, 10 197 whole trade rows. FleetRegister is `'use client'`,
// so every field of every bot it is handed crosses the boundary and is serialized.
//
// FleetOverview.tsx already states the rule, for GlobalEquityCurve's `perf_daily`:
// "never ship a row set to the browser that the browser will not use". It was
// applied to one of the two client props and not the other.
//
// What the browser ACTUALLY reads off a register bot's trades, and nothing else:
//   - `side`      → optionCounts's long/short facet, filterTrades
//   - `asset`     → filterTrades
//   - `pnl`       → win rate, profit factor, capital, drawdown
//   - `closed_at` → the drawdown's chronological order
// `perf_daily` is never read at all: sliceBotStats passes [] in its place, and
// returns `bot.stats` by reference before touching anything when nothing is sliced.
// `recent_trades` is never read either — the fleet-wide feed is its own prop,
// fetched by getRecentTrades(20).
const registerProps: { bots: BotWithStats[] }[] = []
vi.mock('@/components/FleetRegister', () => ({
  default: (props: { bots: BotWithStats[] }) => {
    registerProps.push(props)
    return <div data-testid="register-stub" />
  },
}))

vi.mock('@/components/GlobalEquityCurve', () => ({
  default: () => <div data-testid="equity-curve-stub" />,
}))

vi.mock('next/navigation', () => ({ usePathname: () => '/overview' }))

const trade = (over: Partial<Trade> = {}): Trade => ({
  id: 'f6d5287a-9f16-4eb7-9c74-66c0edd832dd',
  bot_id: 'a1b2c3d4-0000-0000-0000-000000000001',
  opened_at: '2026-09-18T14:54:17.226904+00:00',
  closed_at: '2026-09-20T02:44:39.970326+00:00',
  asset: 'SUI-USDC',
  side: 'long',
  pnl: 7.2066,
  reason: 'trailing_stop',
  is_paper: false,
  entry_price: 0.8061,
  exit_price: 0.84444,
  ...over,
})

const AGG = computeFleetAggregate([], [])

beforeEach(() => {
  registerProps.length = 0
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => null }))
})

function renderWith(bots: BotWithStats[]) {
  render(
    <FleetOverview
      bots={bots}
      aggregate={AGG}
      recentTrades={[]}
      initialState={EMPTY_FILTERS}
      minutes={null}
    />,
  )
  return registerProps[0]!.bots
}

describe('the register prop that crosses the RSC boundary', () => {
  it('carries only the four trade fields the browser reads', () => {
    const rows = renderWith([
      mkBot({ status: 'paper', all_trades: [trade(), trade({ side: 'short', pnl: -3 })] }),
    ])

    for (const t of rows[0]!.all_trades) {
      expect(Object.keys(t).sort()).toEqual(['asset', 'closed_at', 'pnl', 'side'])
    }
  })

  it('carries no perf_daily: sliceBotStats passes [] in its place, always', () => {
    const rows = renderWith([
      mkBot({
        status: 'paper',
        all_trades: [trade()],
        perf_daily: [
          { id: 'p1', bot_id: 'b1', date: '2026-09-01', capital: 1000, pnl_day: 0, win_rate: null, profit_factor: null },
          { id: 'p2', bot_id: 'b1', date: '2026-09-02', capital: 1010, pnl_day: 10, win_rate: 1, profit_factor: 1.4 },
        ],
      }),
    ])

    expect(rows[0]).not.toHaveProperty('perf_daily')
  })

  it('carries no recent_trades: the fleet feed is its own prop', () => {
    const rows = renderWith([
      mkBot({ status: 'paper', all_trades: [trade()], recent_trades: [trade()] }),
    ])

    expect(rows[0]).not.toHaveProperty('recent_trades')
  })
})

// Lot 4 of the design audit (2026-09-25): the register rows draw a 30-day
// sparkline, so they carry `spark30`, a window of at most 30 capital values,
// computed HERE before the boundary. Still no perf_daily: thirty numbers per bot
// cross, not a bot's whole history.
describe('the register prop carries a 30-day window, not the history', () => {
  it('ships spark30 with at most 30 values, oldest first, and still no perf_daily', () => {
    const perf = Array.from({ length: 45 }, (_, i) => ({
      id: `p${i}`, bot_id: 'b1', date: `2026-07-${String(1 + (i % 28)).padStart(2, '0')}`,
      capital: 1000 + i, pnl_day: 0, win_rate: null, profit_factor: null,
    })).map((p, i) => ({ ...p, date: new Date(Date.UTC(2026, 6, 1 + i)).toISOString().slice(0, 10) }))
    const rows = renderWith([mkBot({ status: 'paper', all_trades: [trade()], perf_daily: perf })])
    expect(rows[0]).not.toHaveProperty('perf_daily')
    const spark = (rows[0] as unknown as { spark30: number[] }).spark30
    expect(spark).toHaveLength(30)
    expect(spark[0]).toBe(1015)
    expect(spark[29]).toBe(1044)
  })
})
