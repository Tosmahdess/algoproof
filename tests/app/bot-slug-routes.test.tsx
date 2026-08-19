// tests/app/bot-slug-routes.test.tsx
//
// FIX (final whole-branch review, C1). The three routes that resolve a bot by
// slug all declare `dynamicParams = true`, so being absent from
// generateStaticParams does NOT make a URL unreachable — it only moves the
// render from build time to request time. Each of these was therefore a public
// surface for an engine candidate that never ran: an indexable fiche, an
// iframe embeddable on a third-party site, and a social card image.
//
// The guard itself lives in getBotWithStats (one place, three consumers), and
// tests/lib/queries.test.ts covers it directly. These three tests are the
// end-to-end statement per route: they exercise the real query function
// against a mocked Supabase row, so a future route that stops going through
// getBotWithStats — or a guard quietly narrowed back to `!bot` — fails here.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }))
vi.mock('@/lib/supabase-server', () => ({ supabaseServer: { from: vi.fn() } }))
vi.mock('next/cache', () => ({ unstable_cache: (fn: (...a: unknown[]) => unknown) => fn }))

// The card route must 404 before any image is composed. Throwing from the
// constructor turns "rendered a card for a candidate" into a loud failure
// instead of a silently green test.
vi.mock('next/og', () => ({
  ImageResponse: class {
    constructor() {
      throw new Error('ImageResponse built for a bot that must never be public')
    }
  },
}))

const NOT_FOUND = new Error('NEXT_NOT_FOUND')
vi.mock('next/navigation', () => ({
  notFound: () => { throw NOT_FOUND },
  permanentRedirect: (to: string) => { throw new Error(`unexpected redirect to ${to}`) },
  usePathname: () => '/strategies/bot/x',
}))

import { supabase } from '@/lib/supabase'
import BotFichePage from '@/app/strategies/bot/[slug]/page'
import EmbedPage from '@/app/(embed)/embed/[slug]/page'
import { GET as cardGET } from '@/app/api/card/[slug]/route'

const CANDIDATE = {
  id: 'bot-x',
  slug: 'candidate-never-deployed',
  name: 'Candidate (not deployed) — Wavelet Cross',
  // An engine candidate that was never deployed has no production `bots` row,
  // so it has no real `strategy` sentence to borrow. Marked rather than invented.
  strategy: 'NOT-A-PRODUCTION-STRING (engine candidate, never deployed)',
  status: 'backtest',
  family: 'momentum',
  exchange: 'Hyperliquid',
  venue: 'hyperliquid',
  assets: ['ETH'],
  timeframe: 'H1',
  description: null,
  created_at: '2026-07-29T00:00:00Z',
}

function mockBotRow(row: unknown) {
  const terminal = { data: row, error: null }
  const chain: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(terminal).then(resolve),
    select: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue(terminal),
    single: vi.fn().mockResolvedValue(terminal),
  }
  vi.mocked(supabase.from).mockReturnValue(chain as never)
}

describe('slug routes never publish a bot the listings exclude', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBotRow(CANDIDATE)
  })

  it('/strategies/bot/[slug] 404s on a backtest candidate', async () => {
    await expect(
      BotFichePage({ params: Promise.resolve({ slug: CANDIDATE.slug }) }),
    ).rejects.toBe(NOT_FOUND)
  })

  it('/embed/[slug] 404s on a backtest candidate, so no third-party iframe can show it', async () => {
    await expect(
      EmbedPage({ params: Promise.resolve({ slug: CANDIDATE.slug }) }),
    ).rejects.toBe(NOT_FOUND)
  })

  it('/api/card/[slug] returns 404 on a backtest candidate, with no image composed', async () => {
    const res = await cardGET(
      new Request('https://algoproof.fr/api/card/candidate-never-deployed'),
      { params: Promise.resolve({ slug: CANDIDATE.slug }) },
    )
    expect(res.status).toBe(404)
  })
})

// I1: the named no-route-for-controls test. A median/marginal control never
// gets a `bots` row in the first place — armada_bot_entries only yields
// go_head slugs (pinned publisher-side by test_controls_never_become_entries
// in scripts/test_armada_entries.py). This test pins the site half of that
// seal: guessing a control slug hits the same notFound path as any unknown
// slug, because getBotWithStats's `.single()` finds no row at all — there is
// no bots row to filter by status, no route no matter what URL is guessed.
describe('a control-cohort slug has no bots row, so its fiche 404s too', () => {
  it('/strategies/bot/[slug] 404s for a control slug (no bots row by design)', async () => {
    mockBotRow(null)
    await expect(
      BotFichePage({ params: Promise.resolve({ slug: 'arm-hmacross-h4-median00' }) }),
    ).rejects.toBe(NOT_FOUND)
  })
})
