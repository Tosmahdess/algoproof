// tests/app/bot-fiche-orb-concept-link.test.tsx
//
// Audit 2026-09-10, C0: the `orb` concept fiche describes the Labo's ORB (a cap on
// trades per day, a session end where every position is closed). The engine's ORB
// closes nothing at session end and can fire several times in one session. The bot
// fiche linked engine-born ORB bots to that page, twice (header and explainer box), so
// a reader clicked through to a description of a strategy the bot does not run.
//
// The rule: an engine-born bot whose concept resolves to `orb` carries no link to
// /strategies/orb. The hand-deployed ORB keeps it, which is also what keeps the first
// assertion from passing on a page that simply renders no link at all.
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { mkBot, prodBot } from '../fixtures/bots'
import type { BotWithStats } from '@/lib/types'

vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('unexpected notFound') },
  usePathname: () => '/strategies/bot/x',
}))
vi.mock('@/lib/screening', () => ({ getProvenanceForBot: async () => null }))

const current = vi.hoisted(() => ({ bot: null as unknown }))
vi.mock('@/lib/queries', () => ({
  getBotSlugs: async () => [],
  getBotWithStats: async () => current.bot,
}))

import BotFichePage from '@/app/strategies/bot/[slug]/page'

async function hrefsOn(bot: BotWithStats): Promise<string[]> {
  current.bot = bot
  const { container, unmount } = render(await BotFichePage({ params: Promise.resolve({ slug: bot.slug }) }))
  const hrefs = [...container.querySelectorAll('a')].map(a => a.getAttribute('href') ?? '')
  unmount()
  return hrefs
}

describe('/strategies/bot/[slug]: the Labo ORB fiche is not linked from an engine-born ORB bot', () => {
  it('an engine-born ORB bot has no link to /strategies/orb', async () => {
    const hrefs = await hrefsOn(mkBot({
      slug: 'orb-engine-h1',
      origin: 'engine',
      found_at: '2026-08-20T00:00:00Z',
      engine_unit_key: 'ORB|H1|data_20260802|3',
    }))
    expect(hrefs.length).toBeGreaterThan(0) // the page rendered its links
    expect(hrefs).not.toContain('/strategies/orb')
  })

  it('the hand-deployed ORB still links to the fiche', async () => {
    const hrefs = await hrefsOn(prodBot('orb-bf25', { origin: 'manual' }))
    expect(hrefs).toContain('/strategies/orb')
  })
})
