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

const REPEATED = 'Croisement de moyennes de Hull, configuration issue du gantelet du moteur.'
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
    const link = screen.getByRole('link', { name: /ce que fait cette stratégie/i })
    expect(link).toHaveAttribute('href', '/strategies/ma-cross')
  })

  it('keeps the description for a legacy bot', async () => {
    current = mkBot({ slug: 'v1-spot', description: 'Texte écrit à la main.' })
    render(await StrategyPage({ params: Promise.resolve({ slug: current.slug }) }))
    expect(screen.getByText('Texte écrit à la main.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /ce que fait cette stratégie/i })).toBeNull()
  })

  it('falls back to the description when an engine base has no concept page', async () => {
    current = mkBot({
      slug: 'arm-williamsvolb-d1-head00',
      origin: 'engine',
      engine_unit_key: 'WilliamsVolBreak|D1|data_20260802|3',
      description: 'Cassure de volatilité selon Larry Williams.',
    })
    render(await StrategyPage({ params: Promise.resolve({ slug: current.slug }) }))
    expect(screen.getByText('Cassure de volatilité selon Larry Williams.')).toBeInTheDocument()
  })
})
