// tests/components/EngineRejudgeNotice.test.tsx
//
// Audit 2026-09-10, C0: an audit of the engine's order simulator found three defects, and
// every verdict and count the engine produced came out of that simulator. The notice says so,
// dated, names the three defects, and sits on each surface that shows an engine output: the
// gauntlet explainer (/strategies), the funnel counter (/ and /overview) and the fiche of an
// engine-born bot, which is the page where a visitor decides. One component, so the surfaces
// cannot drift apart.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import { mkBot, prodBot } from '../fixtures/bots'
import type { BotWithStats } from '@/lib/types'

vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('unexpected notFound') },
  usePathname: () => '/strategies/bot/x',
}))
vi.mock('@/lib/screening', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/screening')>()),
  getProvenanceForBot: async () => null,
}))
const current = vi.hoisted(() => ({ bot: null as unknown }))
vi.mock('@/lib/queries', () => ({
  getBotSlugs: async () => [],
  getBotWithStats: async () => current.bot,
}))

import { ENGINE_REJUDGE_NOTICE } from '@/components/EngineRejudgeNotice'
import FunnelCounter from '@/components/FunnelCounter'
import GauntletExplainer from '@/components/GauntletExplainer'
import BotFichePage from '@/app/strategies/bot/[slug]/page'

const ROOT = path.resolve(__dirname, '../..')

describe('EngineRejudgeNotice copy', () => {
  it('is dated, says what was found and that the figures are provisional until re-judged', () => {
    expect(ENGINE_REJUDGE_NOTICE).toMatch(/^Le 10 septembre 2026, un audit a trouvé trois défauts/)
    expect(ENGINE_REJUDGE_NOTICE).toMatch(/simule les ordres/)
    expect(ENGINE_REJUDGE_NOTICE).toMatch(/d’avant la correction/)
    expect(ENGINE_REJUDGE_NOTICE).toMatch(/Je les rejuge/)
    expect(ENGINE_REJUDGE_NOTICE).toMatch(/provisoires/)
  })

  it('names the three defects, so « trois défauts » is not a number without content', () => {
    expect(ENGINE_REJUDGE_NOTICE).toMatch(/stop et la cible ignorés sur la bougie d’entrée/)
    expect(ENGINE_REJUDGE_NOTICE).toMatch(/réentrée sur une bougie où la position précédente était encore ouverte/)
    expect(ENGINE_REJUDGE_NOTICE).toMatch(/gap au-delà du stop rempli au prix du stop/)
  })

  // On the funnel counter the notice sits above the fleet counts too, and those come from
  // the `bots` table, not the engine. The sentence has to say which counters it is about.
  it('scopes the claim to the engine’s own verdicts and counters', () => {
    expect(ENGINE_REJUDGE_NOTICE).toMatch(/les compteurs du moteur affichés ici/)
  })

  it('promises no end date: the only date it carries is the audit day', () => {
    const dates = ENGINE_REJUDGE_NOTICE.match(/\d{1,2} (janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre) \d{4}/g) ?? []
    expect(dates).toEqual(['10 septembre 2026'])
    // Deadline phrasings, not the word « avant » itself: « d’avant la correction »
    // dates the figures, it promises nothing.
    expect(ENGINE_REJUDGE_NOTICE).not.toMatch(/d’ici (le|fin|la fin)\b|avant le \d|jusqu’(au|à) \d|sous (\d+|quelques) (jours|semaines)/)
  })

  it('speaks in the first person singular, with no em or en dash', () => {
    expect(ENGINE_REJUDGE_NOTICE).not.toMatch(/\b(nous|notre|nos)\b/i)
    expect(ENGINE_REJUDGE_NOTICE).not.toMatch(/[—–]/)
  })
})

async function noticesOnFiche(bot: BotWithStats): Promise<number> {
  current.bot = bot
  const { container, unmount } = render(await BotFichePage({ params: Promise.resolve({ slug: bot.slug }) }))
  const n = container.querySelectorAll('[data-testid="engine-rejudge-notice"]').length
  unmount()
  return n
}

describe('EngineRejudgeNotice placement', () => {
  it('sits on the funnel counter', () => {
    const { unmount } = render(<FunnelCounter counts={{ n_swept: 10, n_judged: 5, n_promoted: 3, n_live: 1 }} />)
    const counter = screen.getByTestId('funnel-counter')
    expect(counter.querySelectorAll('[data-testid="engine-rejudge-notice"]')).toHaveLength(1)
    expect(counter.textContent).toContain(ENGINE_REJUDGE_NOTICE)
    unmount()
  })

  it('sits on the gauntlet explainer', () => {
    const { unmount } = render(<GauntletExplainer />)
    const explainer = screen.getByTestId('index-gauntlet')
    expect(explainer.querySelectorAll('[data-testid="engine-rejudge-notice"]')).toHaveLength(1)
    unmount()
  })

  it('sits on the fiche of an engine-born bot, the page where a visitor decides', async () => {
    expect(await noticesOnFiche(mkBot({
      slug: 'emacross-engine-h4',
      origin: 'engine',
      found_at: '2026-08-20T00:00:00Z',
      engine_unit_key: 'EMAcross|H4|data_20260802|3',
    }))).toBe(1)
  })

  it('stays off a hand-deployed bot, whose verdict the engine never produced', async () => {
    expect(await noticesOnFiche(prodBot('v1-spot', { origin: 'manual' }))).toBe(0)
  })

  it('the pages still render the surfaces that carry it', () => {
    const src = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8')
    expect(src('src/app/page.tsx')).toMatch(/<FunnelCounter\b/)
    expect(src('src/app/overview/page.tsx')).toMatch(/<FunnelCounter\b/)
    expect(src('src/app/strategies/page.tsx')).toMatch(/<GauntletExplainer\b/)
    expect(src('src/app/strategies/bot/[slug]/page.tsx')).toMatch(/<EngineRejudgeNotice\b/)
  })
})
