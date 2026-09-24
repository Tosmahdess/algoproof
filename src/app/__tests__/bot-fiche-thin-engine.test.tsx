// An engine bot's description is ARMADA_BASE_DESC_FR[base] — the same
// sentence on every bot of that base. The site stops repeating it: when the
// bot resolves to a concept page, the functional tab points there instead.
// A legacy bot keeps its hand-written description.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { mkBot } from '../../../tests/fixtures/bots'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => null }))
})

const REPEATED = 'Croisement de moyennes de Hull, configuration sélectionnée par mes tests.'
let current = mkBot()

vi.mock('@/lib/queries', () => ({
  getBotWithStats: async () => current,
  getBotSlugs: async () => [],
}))
vi.mock('@/lib/screening', () => ({
  getProvenanceForBot: async () => null,
}))

import StrategyPage from '@/app/strategies/bot/[slug]/page'

describe('bot fiche — functional tab for engine bots', () => {
  it('links to the concept page and does NOT print the repeated description', async () => {
    current = mkBot({
      slug: 'arm-hmacross-h4-head00',
      origin: 'engine',
      engine_unit_key: 'HMAcross|H4|data_20260802|3',
      description: REPEATED,
    })
    render(await StrategyPage({ params: Promise.resolve({ slug: current.slug }) }))
    expect(screen.queryByText(REPEATED)).toBeNull()
    // Since 2026-09-24 the tab also carries the summary inline (EngineBotSummary).
    const link = screen.getByRole('link', { name: /fiche complète de la stratégie/i })
    expect(link).toHaveAttribute('href', '/strategies/ma-cross')
  })

  it('keeps the description for a legacy bot', async () => {
    current = mkBot({ slug: 'v1-spot', description: 'Texte écrit à la main.' })
    render(await StrategyPage({ params: Promise.resolve({ slug: current.slug }) }))
    expect(screen.getByText('Texte écrit à la main.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /fiche complète de la stratégie/i })).toBeNull()
  })

  it('falls back to the description when an engine base has no concept page', async () => {
    // WilliamsVolBreak was the example until its fiche was written (2026-09-24).
    current = mkBot({
      slug: 'arm-liqsweep-h4-head00',
      origin: 'engine',
      engine_unit_key: 'LiqSweep|H4|data_20260802|3',
      description: 'Balayage de liquidité.',
    })
    render(await StrategyPage({ params: Promise.resolve({ slug: current.slug }) }))
    expect(screen.getByText('Balayage de liquidité.')).toBeInTheDocument()
  })
})
