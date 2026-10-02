// src/app/__tests__/overview.test.tsx
// /overview end to end. Refonte « registre », lot 4 (2026-10-02): the page opens
// on its two totals, then ONE register for every bot and every timeframe, from
// the best result to the least good, filterable by family and by timeframe from
// the URL. The real-money cards are gone: those bots are rows of the list. No
// counter tiles, no market-weather banner, no explainer before the data.
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
  it('opens on the two totals, then the one register, with no real-money cards', async () => {
    const { container } = render(await OverviewPage({ searchParams: Promise.resolve({}) }))
    const html = container.innerHTML
    const at = (id: string) => html.indexOf(`data-testid="${id}"`)
    expect(at('fleet-totals')).toBeGreaterThan(-1)
    expect(at('fleet-totals')).toBeLessThan(at('fleet-register'))
    expect(at('fleet-real')).toBe(-1)
    expect(at('fleet-bot-card')).toBe(-1)
    expect(screen.queryByTestId('fleet-kpi-card')).toBeNull()
    expect(screen.queryByTestId('fleet-mi')).toBeNull()
    expect(screen.queryByText(/Chargement du régime/)).toBeNull()
  })

  it('renders one list for every timeframe, in the ledger columns, the timeframe on each row', async () => {
    render(await OverviewPage({ searchParams: Promise.resolve({}) }))
    const table = screen.getByTestId('fleet-table')
    expect(within(table).getAllByRole('columnheader').map(th => th.textContent)).toContain('Bot et marché')
    expect(screen.queryByTestId('fleet-tf-H4')).toBeNull()
    const orb = within(table).getByRole('link', { name: 'ORB H1 HL' }).closest('tr')!
    expect(orb.textContent).toMatch(/H1/)
  })

  it('keeps the archived section below the table', async () => {
    render(await OverviewPage({ searchParams: Promise.resolve({}) }))
    expect(screen.getByTestId('fleet-archived')).toBeTruthy()
  })

  it('still filters by family from the URL', async () => {
    render(await OverviewPage({ searchParams: Promise.resolve({ family: 'carry' }) }))
    const register = screen.getByTestId('fleet-register')
    expect(within(register).queryByText(/Ichimoku/)).toBeNull()
    expect((screen.getByRole('combobox', { name: /Famille/ }) as HTMLSelectElement).value).toBe('carry')
  })

  it('filters by timeframe from the URL', async () => {
    render(await OverviewPage({ searchParams: Promise.resolve({ tf: 'H1' }) }))
    expect((screen.getByRole('combobox', { name: /Horizon/ }) as HTMLSelectElement).value).toBe('H1')
    const register = screen.getByTestId('fleet-register')
    expect(within(register).queryByText('Ichimoku H4 BF')).toBeNull()
  })

  it('says when the fleet was last synced, in the header', async () => {
    render(await OverviewPage({ searchParams: Promise.resolve({}) }))
    expect(screen.getByTestId('fleet-fresh').textContent).toMatch(/il y a|à l’instant/)
  })
})
