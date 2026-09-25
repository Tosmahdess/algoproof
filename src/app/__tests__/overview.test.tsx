// src/app/__tests__/overview.test.tsx
// /overview end to end (lot 4 of the design audit, 2026-09-25): the page opens on
// its two totals and the real-money cards, then one register table for every
// timeframe, filterable by family and by timeframe from the URL. No counter
// tiles, no market-weather banner, no explainer before the data.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { FIXTURE_FLEET } from '../../../tests/fixtures/bots'

vi.mock('next/navigation', () => ({
  usePathname: () => '/overview',
}))

vi.mock('@/lib/queries', () => ({
  getAllBotsWithStats: async () => FIXTURE_FLEET,
  getAllTradesForAggregate: async () => [],
  getLiveBots: async () => FIXTURE_FLEET.filter(b => b.status === 'live')
    .map(b => ({ id: b.id, live_since: '2026-01-01T00:00:00Z' })),
  getRecentTrades: async () => [],
}))

import OverviewPage from '@/app/overview/page'

describe('/overview — the fleet in one table', () => {
  it('opens on the two totals, then the real-money cards, then the register', async () => {
    const { container } = render(await OverviewPage({ searchParams: Promise.resolve({}) }))
    const html = container.innerHTML
    const at = (id: string) => html.indexOf(`data-testid="${id}"`)
    expect(at('fleet-totals')).toBeGreaterThan(-1)
    expect(at('fleet-totals')).toBeLessThan(at('fleet-real'))
    expect(at('fleet-real')).toBeLessThan(at('fleet-register'))
    expect(screen.queryByTestId('fleet-kpi-card')).toBeNull()
    expect(screen.queryByTestId('fleet-mi')).toBeNull()
    expect(screen.queryByText(/Chargement du régime/)).toBeNull()
  })

  it('renders one table for every timeframe, headed by the timeframe column', async () => {
    render(await OverviewPage({ searchParams: Promise.resolve({}) }))
    const table = screen.getByTestId('fleet-table')
    expect(within(table).getAllByRole('columnheader').map(th => th.textContent)).toContain('TF')
    expect(screen.queryByTestId('fleet-tf-H4')).toBeNull()
  })

  it('keeps the archived section below the table', async () => {
    render(await OverviewPage({ searchParams: Promise.resolve({}) }))
    expect(screen.getByTestId('fleet-archived')).toBeTruthy()
  })

  it('still filters by family from the URL', async () => {
    render(await OverviewPage({ searchParams: Promise.resolve({ family: 'carry' }) }))
    const register = screen.getByTestId('fleet-register')
    expect(within(register).queryByText(/Ichimoku/)).toBeNull()
    expect(screen.getByRole('button', { name: /Portage \(\d+\)/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('filters by timeframe from the URL', async () => {
    render(await OverviewPage({ searchParams: Promise.resolve({ tf: 'H1' }) }))
    expect(screen.getByRole('button', { name: /^H1 \(\d+\)$/ })).toHaveAttribute('aria-pressed', 'true')
    const register = screen.getByTestId('fleet-register')
    expect(within(register).queryByText('Ichimoku H4 BF')).toBeNull()
  })

  it('says when the fleet was last synced, in the header', async () => {
    render(await OverviewPage({ searchParams: Promise.resolve({}) }))
    expect(screen.getByTestId('fleet-fresh').textContent).toMatch(/il y a|à l’instant/)
  })
})
