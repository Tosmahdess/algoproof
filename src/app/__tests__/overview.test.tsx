// src/app/__tests__/overview.test.tsx
// /overview rebuilt (task 6) as one <BotTable> per timeframe, via the pure
// groupByTimeframe helper — this is the page-level smoke test the brief asks
// for: page.tsx itself carries no new logic (grouping is fleet-grouping.ts's
// job, rendering is FleetRegister's), so this just pins that the real
// component tree renders the per-TF sections and the archived section when
// the page runs end to end.
//
// Task 7: page.tsx now also calls getWaveMeasure() — mocked below to null so
// this smoke test stays about the timeframe/archived structure, not the
// encart (that's WaveExperiment.test.tsx's job). Two FIXTURE_FLEET bots
// (atrchannel-k3, candidate-never-deployed) do carry an engine_unit_key, so
// the encart does render here (withheld-PF branch, null measure) — none of
// these assertions query for it, so its presence is incidental, not pinned.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { FIXTURE_FLEET } from '../../../tests/fixtures/bots'

vi.mock('next/navigation', () => ({
  usePathname: () => '/overview',
}))

// MiBanner (stage 0, unrelated to this task) fetches /api/mi on mount — same
// stub FleetOverview.test.tsx uses, so it doesn't leave an unhandled rejection.
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => null }))
})

vi.mock('@/lib/queries', () => ({
  getAllBotsWithStats: async () => FIXTURE_FLEET,
  getAllTradesForAggregate: async () => [],
  getLiveBotIds: async () => FIXTURE_FLEET.filter(b => b.status === 'live').map(b => b.id),
  getRecentTrades: async () => [],
  getWaveMeasure: async () => null,
}))
vi.mock('@/lib/funnel', () => ({
  getFunnelCounts: async () => null,
}))

import OverviewPage from '@/app/overview/page'

describe('/overview — one table per timeframe', () => {
  it('renders a section per timeframe present in the active register', async () => {
    render(await OverviewPage({ searchParams: Promise.resolve({}) }))
    // FIXTURE_FLEET's register bots (paper, non-archived) are all H4 — see
    // tests/fixtures/bots.ts. One H4 section, headed with its strategy count.
    const h4 = screen.getByTestId('fleet-tf-H4')
    expect(within(h4).getByText(/^H4 — \d+ stratégies$/)).toBeTruthy()
  })

  it('keeps the archived section below the timeframe tables', async () => {
    render(await OverviewPage({ searchParams: Promise.resolve({}) }))
    expect(screen.getByTestId('fleet-archived')).toBeTruthy()
  })

  it('still filters by family, above the tables', async () => {
    render(await OverviewPage({ searchParams: Promise.resolve({ family: 'carry' }) }))
    const register = screen.getByTestId('fleet-register')
    expect(within(register).queryByText(/Ichimoku/)).toBeNull()
    expect(screen.getByRole('button', { name: /Portage \(\d+\)/ })).toHaveAttribute('aria-pressed', 'true')
  })
})
