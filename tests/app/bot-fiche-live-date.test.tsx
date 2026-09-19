// tests/app/bot-fiche-live-date.test.tsx
//
// Pre-launch audit 2026-09-09, §2.5: the v1-spot fiche served TWO real-money
// start dates — « depuis le 17/04/2026 » from bots.live_since (provenance line)
// and « depuis le 08/05/2026 » from a literal in bot-expectations.ts, rendered
// by PathToRealCard. One reader, two dates, on the page whose job is to be
// believed. User decision: v1-spot = 17/04/2026, V1-HL = 06/04/2026, and the
// site derives the date from `bots.live_since` rather than retyping it.
//
// The guard is at page level and sweeps EVERY « En argent réel depuis le … »
// on the fiche: a second source of truth anywhere on the page fails here, not
// only the one PathToRealCard prop the audit named.
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { prodBot } from '../fixtures/bots'

vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('unexpected notFound') },
  usePathname: () => '/strategies/bot/v1-spot',
}))
vi.mock('@/lib/screening', () => ({ getProvenanceForBot: async () => null }))

const current = vi.hoisted(() => ({ bot: null as unknown }))
vi.mock('@/lib/queries', () => ({
  getBotSlugs: async () => [],
  getBotWithStats: async () => current.bot,
}))

import BotFichePage from '@/app/strategies/bot/[slug]/page'

const DATE_RE = /En argent réel depuis le (\d{2}\/\d{2}\/\d{4})/g

async function datesOnFiche(slug: string, liveSince: string): Promise<string[]> {
  current.bot = prodBot(slug, { status: 'live', live_since: liveSince })
  const { container } = render(await BotFichePage({ params: Promise.resolve({ slug }) }))
  return [...(container.textContent ?? '').matchAll(DATE_RE)].map(m => m[1])
}

describe('/strategies/bot/[slug] — one real-money start date per bot', () => {
  it('v1-spot: every start date on the page is the one from bots.live_since', async () => {
    const dates = await datesOnFiche('v1-spot', '2026-04-17T00:00:00Z')
    // guard against a vacuous pass: the sentence must exist at least once
    expect(dates.length).toBeGreaterThan(0)
    expect(new Set(dates)).toEqual(new Set(['17/04/2026']))
  })

  // 2026-09-11 review (P2): provenance.ts formatted in UTC, PathToRealCard in
  // Europe/Paris. At 23:30 UTC the two surfaces printed two different days.
  // 2026-09-19 (D056): the card no longer repeats the date, so there is ONE
  // surface — and it must still print the Paris day.
  it('a live_since late in the UTC day prints the Paris day, once', async () => {
    const dates = await datesOnFiche('v1-spot', '2026-04-16T23:30:00Z')
    expect(dates).toEqual(['17/04/2026'])
  })

  it('orb-bf25: same rule, the literal in bot-expectations must not resurface', async () => {
    const dates = await datesOnFiche('orb-bf25', '2026-06-18T00:00:00Z')
    expect(dates.length).toBeGreaterThan(0)
    expect(new Set(dates)).toEqual(new Set(['18/06/2026']))
  })
})
