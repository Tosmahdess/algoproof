// tests/app/bot-fiche-functional-summary.test.tsx
//
// 2026-09-24, user's call (option A): the Fonctionnel tab of an engine-born
// bot used to be one line and a link to the concept page. It now carries the
// summary itself, from the concept fiche (entry, where it works, where it
// dies), plus what is this bot's own: timeframe, head, markets. What sets a
// head apart (settings, filters, exit) stays in the members-only Technique tab:
// nothing here may name a parameter value.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { mkBot } from '../fixtures/bots'
import { getStrategyFiche } from '@/lib/strategy-library'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
    ok: true,
    json: async () => (String(url).includes('/api/comments') ? [] : null),
  })))
})

const state = vi.hoisted(() => ({ bot: null as unknown }))
vi.mock('@/lib/queries', () => ({
  getBotWithStats: async () => state.bot,
  getBotSlugs: async () => [],
}))
vi.mock('@/lib/screening', () => ({ getProvenanceForBot: async () => null }))

import StrategyPage from '@/app/strategies/bot/[slug]/page'

const keltner = () => mkBot({
  slug: 'arm-keltnerbreak-h4-head03',
  name: 'Keltner Channel H4 — moteur · grappe 03',
  origin: 'engine',
  exchange: 'Binance Futures',
  timeframe: 'H4',
  assets: ['ADA/USDT', 'ETH/USDT', 'SOL/USDT'],
  engine_unit_key: 'KeltnerBreak|H4|data_20260802|3',
  description: 'Cassure de canal de Keltner, configuration issue du gantelet du moteur.',
})

async function renderFiche() {
  render(await StrategyPage({ params: Promise.resolve({ slug: (state.bot as { slug: string }).slug }) }))
}

describe('Fonctionnel tab of an engine-born bot', () => {
  it('carries the concept summary inline, not just a link', async () => {
    state.bot = keltner()
    await renderFiche()
    const fiche = getStrategyFiche('keltner')!
    expect(screen.getByText(fiche.oneLiner)).toBeInTheDocument()
    expect(screen.getByText(fiche.logic[0])).toBeInTheDocument()
    expect(screen.getByText(fiche.worksWhen[0])).toBeInTheDocument()
    expect(screen.getByText(fiche.diesWhen[0])).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /fiche complète/i }))
      .toHaveAttribute('href', '/strategies/keltner')
  })

  it("names this bot's own facts: head, timeframe, markets", async () => {
    state.bot = keltner()
    await renderFiche()
    const own = screen.getByTestId('engine-bot-own')
    expect(own).toHaveTextContent(/grappe n° 03/)
    expect(own).toHaveTextContent(/H4/)
    expect(own).toHaveTextContent(/3 marchés Binance Futures/)
    expect(own).toHaveTextContent(/onglet Technique, que je réserve aux membres/)
  })

  it('never renders the Lab parameter names of the fiche on a wave bot', async () => {
    state.bot = keltner()
    await renderFiche()
    const summary = screen.getByTestId('engine-bot-summary')
    for (const p of getStrategyFiche('keltner')!.params) {
      expect(summary.textContent).not.toContain(p.name)
    }
  })

  it('no machine identifier (snake_case) reaches the summary of any engine base', async () => {
    for (const [base, slug] of [['HMAcross', 'arm-hmacross-h4-head00'], ['KeltnerBreak', 'arm-keltnerbreak-h4-head00'],
      ['EMAcross', 'arm-emacross-d1-head01'], ['KAMAcross', 'arm-kamacross-h4-head00'], ['DonchianBreakout', 'arm-donchianbrea-h4-head00'],
      ['ATRChannel', 'arm-atrchannel-h4-head00'], ['HeikinAshiTrend', 'arm-heikinashitr-h4-head00'], ['TEMAcross', 'arm-temacross-h4-head00'], ['WilliamsVolBreak', 'arm-williamsvolb-d1-head01']]) {
      state.bot = mkBot({ slug, origin: 'engine', engine_unit_key: `${base}|H4|data_20260802|3` })
      const { unmount } = render(await StrategyPage({ params: Promise.resolve({ slug }) }))
      const text = screen.getByTestId('engine-bot-summary').textContent ?? ''
      expect(text, base).not.toMatch(/\b[a-z]+_[a-z_]+\b/)
      unmount()
    }
  })

  it('the free sample does not promise a members-only Technique tab', async () => {
    state.bot = mkBot({
      slug: 'arm-emacross-h4-head00', origin: 'engine', exchange: 'Binance Futures', timeframe: 'H4',
      engine_unit_key: 'EMAcross|H4|data_20260802|3',
    })
    await renderFiche()
    const own = screen.getByTestId('engine-bot-own')
    expect(own).toHaveTextContent(/onglet Technique\./)
    expect(own).not.toHaveTextContent(/réserve aux membres/)
  })

  it('a base without a fiche keeps its description sentence', async () => {
    state.bot = mkBot({
      slug: 'arm-liqsweep-h4-head00', origin: 'engine',
      engine_unit_key: 'LiqSweep|H4|data_20260802|3',
      description: 'Balayage de liquidité, configuration issue du gantelet du moteur.',
    })
    await renderFiche()
    expect(screen.queryByTestId('engine-bot-summary')).toBeNull()
    expect(screen.getByText(/Balayage de liquidité/)).toBeInTheDocument()
  })

  // 2026-09-24: WilliamsVolBreak got its fiche; its engine bots now carry the summary.
  it('a WilliamsVolBreak bot carries the summary of its new fiche', async () => {
    state.bot = mkBot({
      slug: 'arm-williamsvolb-d1-head01', origin: 'engine', timeframe: 'D1',
      engine_unit_key: 'WilliamsVolBreak|D1|data_20260802|3',
      description: 'Cassure de volatilité selon Larry Williams, configuration issue du gantelet du moteur.',
    })
    await renderFiche()
    expect(screen.getByTestId('engine-bot-summary')).toHaveTextContent(/bougie explosive/)
    expect(screen.getByRole('link', { name: /fiche complète/i }))
      .toHaveAttribute('href', '/strategies/williams-vol-break')
  })
})
