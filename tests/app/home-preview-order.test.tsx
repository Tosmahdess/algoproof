// tests/app/home-preview-order.test.tsx
//
// The home's top-10 preview ranks the fleet by realized P&L. Its inline sort
// treated a bot that has NEVER TRADED as a zero gain, so a dormant bot ranked
// above every losing one — a row reading "0 €" that is not a result but the
// absence of one. /overview's register stopped doing that on 2026-08-20
// (byGainDesc); this pins that the home tells the same story, from the same
// function, rather than two rankings of "gain" drifting apart on one site.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { mkBot } from '../fixtures/bots'

const FLEET = [
  mkBot({
    slug: 'dormant', name: 'Dormant Bot', start_capital: 1000,
    stats: { win_rate: 0, profit_factor: 0, max_drawdown: 0, total_trades: 0, latest_capital: 1000 },
  }),
  mkBot({
    slug: 'loser', name: 'Losing Bot', start_capital: 1000,
    stats: { win_rate: 0.3, profit_factor: 0.7, max_drawdown: 0.2, total_trades: 55, latest_capital: 880 },
  }),
]

vi.mock('@/lib/queries', () => ({
  getAllBotsWithStats: async () => FLEET,
}))
vi.mock('@/lib/funnel', () => ({
  getFunnelCounts: async () => null,
}))

import HomePage from '@/app/page'

describe('/ — top-10 preview order', () => {
  it('ranks a bot that has traded and lost above one that has never traded', async () => {
    render(await HomePage())

    const names = screen.getAllByText(/Bot$/).map(n => n.textContent)
    expect(names.indexOf('Losing Bot')).toBeLessThan(names.indexOf('Dormant Bot'))
    // guard: both must actually be on the page, or indexOf(-1) makes this vacuous
    expect(names).toContain('Losing Bot')
    expect(names).toContain('Dormant Bot')
  })
})
