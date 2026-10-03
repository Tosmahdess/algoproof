// tests/app/strategies-reads-no-history.test.tsx
//
// Lot 1b (D094): /strategies only COUNTS the bots behind each fiche (slug, unit key,
// status). It used to call getAllBotsWithStats, i.e. every trade and every daily point
// of every public bot, to then read `.length`. The page must render its counts from
// the bot rows alone.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('unexpected notFound') },
  permanentRedirect: (to: string) => { throw new Error(`unexpected redirect to ${to}`) },
}))
vi.mock('@/lib/funnel', () => ({ getFunnelCounts: async () => null }))
vi.mock('@/lib/engine-search-space', () => ({ getSearchSpace: async () => null }))
vi.mock('@/lib/queries', () => ({
  getBots: async () => [
    { id: '1', slug: 'emacross-bf7-x10', name: 'EMA Cross H4', status: 'paper',
      engine_unit_key: null, family: 'trend', start_capital: 1000 },
    { id: '2', slug: 'emacross-9-bf9', name: 'EMA Cross H4', status: 'archived',
      engine_unit_key: null, family: 'trend', start_capital: 1000 },
  ],
  getAllBotsWithStats: async () => { throw new Error('/strategies must not load bot histories') },
}))

import StrategiesIndexPage from '@/app/strategies/page'

describe('/strategies counts bots without loading their history', () => {
  it('renders the fiche counts from the bot rows alone, archived bots excluded', async () => {
    const { container } = render(await StrategiesIndexPage())
    expect(screen.getByTestId('strategies-register')).toBeTruthy()
    const ema = [...container.querySelectorAll('a[href="/strategies/ema-cross"]')]
      .map(a => (a.closest('li, tr, article') ?? a).textContent ?? '')
      .join(' ')
    // « 1 bot », not « 2 bots »: the archived one does not count.
    expect(ema).toMatch(/1\s*bot(?!s)/)
  })
})
