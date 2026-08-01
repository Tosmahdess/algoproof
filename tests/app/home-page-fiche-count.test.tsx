// tests/app/home-page-fiche-count.test.tsx
//
// The « Apprendre » card used to hardcode « 22 stratégies ». Production held 40
// bots while the OG card said 38 — the same failure mode: a count that goes
// stale silently because nothing re-derives it when the library grows. This
// asserts the copy tracks STRATEGY_FICHES.length so a new fiche cannot desync
// the two again.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/lib/queries', () => ({
  getAllBotsWithStats: async () => [],
}))
vi.mock('@/lib/funnel', () => ({
  getFunnelCounts: async () => null,
}))

import HomePage from '@/app/page'
import { STRATEGY_FICHES } from '@/lib/strategy-library'

describe('/ — the strategy library count in the "Apprendre" card', () => {
  it('reads the live fiche count, not a literal', async () => {
    render(await HomePage())
    const link = screen.getAllByRole('link').find(a => a.getAttribute('href') === '/strategies')!
    expect(link.textContent).toContain(`${STRATEGY_FICHES.length} stratégies`)
  })
})
