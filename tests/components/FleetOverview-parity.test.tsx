// tests/components/FleetOverview-parity.test.tsx
//
// Lot 1b (D094): /overview moves from « every bot with every trade » to « every bot with
// its stored summary ». The page a reader gets must not change by one character. The
// snapshots below were written by the PREVIOUS FleetOverview (fed BotWithStats, as the
// page did until 03/10) and are now read by the new one (fed summaries): same fleet,
// same day, three URLs.
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { render } from '@testing-library/react'
import type { BotWithStats, PerfDaily, Trade } from '@/lib/types'
import { FIXTURE_FLEET } from '../fixtures/bots'
import { parseFleetFilters } from '@/lib/bot-filters'
import type { FleetAggregate } from '@/lib/fleet-aggregate'
import FleetOverview from '@/components/FleetOverview'

vi.mock('next/navigation', () => ({ usePathname: () => '/overview' }))
// The chart draws nothing in jsdom: its data goes into the snapshot instead. The register
// renders for real, and the rows it receives (what the page serialises to the browser)
// go into the snapshot too, hidden slices included.
vi.mock('@/components/GlobalEquityCurve', () => ({
  default: (p: unknown) => <pre data-testid="curves-props">{JSON.stringify(p)}</pre>,
}))
vi.mock('@/components/FleetRegister', async importOriginal => {
  const Real = (await importOriginal<typeof import('@/components/FleetRegister')>()).default
  return {
    default: (p: Parameters<typeof Real>[0]) => (
      <><pre data-testid="register-props">{JSON.stringify(p.bots)}</pre><Real {...p} /></>
    ),
  }
})

const NOW = new Date('2026-10-03T14:00:00Z')
const AGG: FleetAggregate = { rows: [], totalTrades: 0, totalPnlReal: 0, totalPnlLabo: 0, tradesReal: 0, tradesLabo: 0 }

const perf = (bot: string, date: string, capital: number): PerfDaily => ({
  id: bot + date, bot_id: bot, date, capital, pnl_day: 0, win_rate: null, profit_factor: null,
})
const trade = (bot: string, pnl: number, day: string, side: 'long' | 'short', asset: string): Trade => ({
  id: bot + day + side + asset, bot_id: bot, opened_at: `${day}T00:00:00Z`, closed_at: `${day}T08:00:00Z`,
  asset, side, pnl, reason: null, is_paper: true, entry_price: 1, exit_price: 1,
})

/** The fixture fleet, with real ledgers on four bots (sides, assets, a carried point
 *  before the 30-day window, an engine line on one). */
function fleet(): BotWithStats[] {
  return FIXTURE_FLEET.map((b, i) => {
    if (i > 3) return b
    const s = b.slug
    const trades = [trade(s, 12, '2026-09-05', 'long', 'BTC-USDT'), trade(s, -5, '2026-09-12', 'short', 'ETH-USDT'),
      trade(s, 7.5, '2026-09-20', 'long', 'SOL-USDT'), trade(s, -2.25, '2026-09-28', 'short', 'BTC-USDT')]
      .slice(0, i + 1)
    const daily = [perf(s, '2026-08-20', 1001), perf(s, '2026-09-05', 1012), perf(s, '2026-09-12', 1007),
      perf(s, '2026-09-20', 1014.5), perf(s, '2026-09-28', 1012.25)].slice(0, i + 2)
    return {
      ...b, all_trades: trades, perf_daily: daily,
      ...(i === 2 ? { list_perf_daily: daily.map(p => ({ ...p, capital: p.capital * 1.1 })) } : {}),
    }
  })
}

const URLS: Record<string, Record<string, string>> = {
  default: {},
  short: { side: 'short' },
  asset: { asset: 'BTC' },
}

beforeAll(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(NOW) })
afterAll(() => { vi.useRealTimers() })

describe('/overview renders the same page from summaries as from trades', () => {
  for (const [name, params] of Object.entries(URLS)) {
    it(`URL « ${name} »`, async () => {
      const initialState = parseFleetFilters(new URLSearchParams(params))
      const { container } = render(
        <FleetOverview bots={fleet()} aggregate={AGG} recentTrades={[]}
          initialState={initialState} minutes={null} />,
      )
      await expect(container.innerHTML).toMatchFileSnapshot(`./__snapshots__/fleet-overview-${name}.html`)
    })
  }
})
