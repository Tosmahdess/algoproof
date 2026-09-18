// tests/components/EngineRejudgeNotice.test.tsx
//
// The dated re-judge notice (audit 2026-09-10, C0) sat on the funnel counter, the gauntlet
// explainer and the fiche of an engine-born bot. It was REMOVED on 2026-09-18 on the owner's
// decision, once the corrected D1 tour was published. These tests keep it gone from the three
// surfaces it lived on, rendered rather than grepped: a notice can come back through a
// component nobody thought to check.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import { mkBot } from '../fixtures/bots'
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

import FunnelCounter from '@/components/FunnelCounter'
import GauntletExplainer from '@/components/GauntletExplainer'
import BotFichePage from '@/app/strategies/bot/[slug]/page'

const ROOT = path.resolve(__dirname, '../..')
const GONE = /un audit a trouvé trois défauts|restent provisoires|Verdicts provisoires/

async function ficheText(bot: BotWithStats): Promise<{ text: string; notices: number }> {
  current.bot = bot
  const { container, unmount } = render(await BotFichePage({ params: Promise.resolve({ slug: bot.slug }) }))
  const out = {
    text: container.textContent ?? '',
    notices: container.querySelectorAll('[data-testid="engine-rejudge-notice"]').length,
  }
  unmount()
  return out
}

describe('the 2026-09-10 re-judge notice is gone (removed 2026-09-18)', () => {
  it('is off the funnel counter, which still renders', () => {
    const { unmount } = render(<FunnelCounter counts={{ n_swept: 10, n_judged: 5, n_promoted: 3, n_live: 1 }} />)
    const counter = screen.getByTestId('funnel-counter')
    expect(counter.querySelectorAll('[data-testid="engine-rejudge-notice"]')).toHaveLength(0)
    expect(counter.textContent).not.toMatch(GONE)
    unmount()
  })

  it('is off the gauntlet explainer, which still renders', () => {
    const { unmount } = render(<GauntletExplainer />)
    const explainer = screen.getByTestId('index-gauntlet')
    expect(explainer.querySelectorAll('[data-testid="engine-rejudge-notice"]')).toHaveLength(0)
    expect(explainer.textContent).not.toMatch(GONE)
    unmount()
  })

  it('is off the fiche of an engine-born bot, which still renders', async () => {
    const { text, notices } = await ficheText(mkBot({
      slug: 'emacross-engine-h4',
      origin: 'engine',
      found_at: '2026-08-20T00:00:00Z',
      engine_unit_key: 'EMAcross|H4|data_20260802|3',
    }))
    expect(notices).toBe(0)
    expect(text.length).toBeGreaterThan(100)          // the fiche did render (non-vacuous)
    expect(text).not.toMatch(GONE)
  })

  it('the component file is deleted, not just unmounted', () => {
    expect(fs.existsSync(path.join(ROOT, 'src/components/EngineRejudgeNotice.tsx'))).toBe(false)
  })
})
