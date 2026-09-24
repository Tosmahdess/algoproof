// src/app/__tests__/bot-fiche-gated-params.test.tsx
// Task 10: the fiche's `technical` tab gains a third rendering branch. A wave
// bot the engine promoted carries `engine_unit_key` but (until its BOT_PARAMS
// entry is written) no fiche entry — the previous code treated that exactly
// like an undocumented legacy bot and printed "Paramètres techniques en cours
// de documentation", which is false: the config is withheld on purpose
// (paid labo asset), not unwritten. This pins that a wave bot never shows
// that sentence and instead shows the gated block with a working dossier link.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { mkBot } from '../../../tests/fixtures/bots'

// MiBanner / DiscussionTab-style client fetches — same stub overview.test.tsx
// uses, so a background fetch doesn't leave an unhandled rejection.
beforeEach(() => {
  // Comments answer a list (DiscussionTab reads .length once its fetch lands).
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
    ok: true,
    json: async () => (String(url).includes('/api/comments') ? [] : null),
  })))
})

// engine_unit_key shape (cross-repo contract, 2026-08-19): the vault's armada
// publisher emits 'HMAcross|H4|data_20260802|3' — the 4-segment shape
// provenance.ts's dossierHref requires, so the top-of-page "Voir le dossier
// de validation" link now resolves too, alongside the gated block's own
// "Voir le dossier de la stratégie" link — both point at the same dossier,
// which is why the assertion below targets the gated block's link by its
// own text rather than any link matching /dossier/i.
const waveBot = mkBot({
  slug: 'hmacross-wave-head03',
  name: 'HMA Cross Wave Head 03',
  origin: 'engine',
  engine_unit_key: 'HMAcross|H4|data_20260802|3',
})

vi.mock('@/lib/queries', () => ({
  getBotWithStats: async () => waveBot,
  getBotSlugs: async () => [],
}))
vi.mock('@/lib/screening', () => ({
  getProvenanceForBot: async () => null,
}))

import StrategyPage from '@/app/strategies/bot/[slug]/page'

describe('bot fiche — gated params block for wave bots', () => {
  it('never renders the documentation fallback, and shows the gated block with its dossier link', async () => {
    render(await StrategyPage({ params: Promise.resolve({ slug: waveBot.slug }) }))
    // The technical section only mounts once its tab is active.
    fireEvent.click(screen.getByRole('button', { name: /Technique/i }))

    expect(screen.queryByText(/en cours de documentation/)).toBeNull()
    expect(await screen.findByText(/réservée aux membres du labo/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Voir le dossier de la stratégie/i }))
      .toHaveAttribute('href', expect.stringContaining('lab.algoproof.fr/cockpit/dossier/hmacross'))
  })
})

// 2026-09-24: a paying member now sees the recipe itself in the tab, fetched
// from /api/bot/[slug]/recipe after the page has loaded. The static HTML stays
// the same for everyone, so no recipe value may ever be in it.
describe('bot fiche — the recipe for members', () => {
  const SENTINEL = 424242
  const answer = (body: unknown) =>
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
      ok: true,
      json: async () =>
        String(url).includes('/recipe') ? body : String(url).includes('/api/comments') ? [] : null,
    })))

  async function openTechnique() {
    render(await StrategyPage({ params: Promise.resolve({ slug: waveBot.slug }) }))
    fireEvent.click(screen.getByRole('button', { name: /Technique/i }))
  }

  it('a member sees the recipe values, not the members-only sentence', async () => {
    answer({ entitlement: 'paid', recipe: { tf: 'H4', params: { period: SENTINEL }, filters: {}, exit: null } })
    await openTechnique()
    expect(await screen.findByText(String(SENTINEL))).toBeInTheDocument()
    expect(screen.queryByText(/réservée aux membres du labo/)).toBeNull()
  })

  it('a free visitor keeps the members-only sentence and the dossier link', async () => {
    answer({ entitlement: 'free' })
    await openTechnique()
    expect(await screen.findByText(/réservée aux membres du labo/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Voir le dossier de la stratégie/i })).toBeInTheDocument()
  })

  it('an unavailable answer says so to the member', async () => {
    answer({ entitlement: 'paid', indisponible: true })
    await openTechnique()
    expect(await screen.findByText(/momentanément indisponible/)).toBeInTheDocument()
  })

  it('a paid answer without a recipe never shows a member the members-only sentence', async () => {
    answer({ entitlement: 'paid' })
    await openTechnique()
    expect(await screen.findByText(/momentanément indisponible/)).toBeInTheDocument()
    expect(screen.queryByText(/réservée aux membres du labo/)).toBeNull()
  })

  it('the server-rendered page carries no recipe value, whatever the route would answer', async () => {
    answer({ entitlement: 'paid', recipe: { tf: 'H4', params: { period: SENTINEL }, filters: {}, exit: null } })
    const { renderToStaticMarkup } = await import('react-dom/server')
    const html = renderToStaticMarkup(await StrategyPage({ params: Promise.resolve({ slug: waveBot.slug }) }))
    expect(html).not.toContain(String(SENTINEL))
  })
})
