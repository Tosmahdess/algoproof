// tests/app/strategy-pages.test.tsx
//
// FIX (final whole-branch review, I4). `incarnationsOf` matches on the
// strategy string and has no opinion about status, and its input was the raw
// fleet — so a retired bot appeared under « Ce qui tourne chez moi » on a
// concept page and counted towards « N bots » on the index. Both are claims
// about the present tense.
//
// Asserted at the PAGE level, not by re-testing excludeArchived (cohort.test.ts
// already covers that): the defect was a missing call at two call sites, so
// the test has to be able to see the call sites.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('unexpected notFound') },
  permanentRedirect: (to: string) => { throw new Error(`unexpected redirect to ${to}`) },
}))

const bots = vi.hoisted(() => ({ current: [] as unknown[] }))
vi.mock('@/lib/queries', () => ({
  getAllBotsWithStats: async () => bots.current,
  getBotSlugs: async () => [],
}))

import ConceptPage from '@/app/strategies/[concept]/page'
import StrategiesIndexPage from '@/app/strategies/page'
import { mkBot } from '../fixtures/bots'

const RUNNING = mkBot({ slug: 'orb-live', name: 'ORB Running', strategy: 'ORB', status: 'paper' })
const RETIRED = mkBot({
  slug: 'orb-old', name: 'ORB Retired', strategy: 'ORB',
  status: 'archived', archived_at: '2026-06-01T00:00:00Z',
})

describe('/strategies/[concept] — « Ce qui tourne chez moi »', () => {
  it('omits an archived bot from the list of what is running', async () => {
    bots.current = [RUNNING, RETIRED]
    render(await ConceptPage({ params: Promise.resolve({ concept: 'orb' }) }))
    const section = screen.getByTestId('concept-incarnations')
    expect(within(section).getByText('ORB Running')).toBeTruthy()
    expect(within(section).queryByText('ORB Retired')).toBeNull()
  })

  it('says nothing is running when the only bot for the concept is archived', async () => {
    bots.current = [RETIRED]
    render(await ConceptPage({ params: Promise.resolve({ concept: 'orb' }) }))
    const section = screen.getByTestId('concept-incarnations')
    expect(within(section).getByText(/Aucun bot ne fait tourner cette stratégie/)).toBeTruthy()
  })
})

describe('/strategies — the incarnation count next to each fiche', () => {
  it('does not count an archived bot', async () => {
    bots.current = [RUNNING, RETIRED]
    render(await StrategiesIndexPage())
    const orbLink = screen.getByRole('link', { name: /ORB \(Opening Range Breakout\)/ })
    expect(orbLink.textContent).toContain('1 bot')
    expect(orbLink.textContent).not.toContain('2 bots')
  })

  it('reads « aucun bot » when every bot for the fiche is archived', async () => {
    bots.current = [RETIRED]
    render(await StrategiesIndexPage())
    const orbLink = screen.getByRole('link', { name: /ORB \(Opening Range Breakout\)/ })
    expect(orbLink.textContent).toContain('aucun bot')
  })
})
