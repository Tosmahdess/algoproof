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
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => null }))
})

// engine_unit_key shape per task brief: 'HMAcross|H4|data_20260802|base|3' —
// 5 pipe-delimited segments, not the 4-segment shape provenance.ts's
// dossierHref requires, so the top-of-page "Voir le dossier de validation"
// link stays absent and doesn't collide with the gated block's own link.
const waveBot = mkBot({
  slug: 'hmacross-wave-head03',
  name: 'HMA Cross Wave Head 03',
  origin: 'engine',
  engine_unit_key: 'HMAcross|H4|data_20260802|base|3',
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
    expect(screen.getByText(/réservée aux membres du labo/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /dossier/i }))
      .toHaveAttribute('href', expect.stringContaining('lab.algoproof.fr/cockpit/dossier/hmacross'))
  })
})
