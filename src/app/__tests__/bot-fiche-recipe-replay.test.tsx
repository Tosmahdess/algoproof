// A wave-1 bot was chosen by the August engine. Its fiche now says what the
// replay on the repaired execution gives for its own recipe — as a replay,
// never as a verdict, and without any hard-gate outcome (user decision
// 2026-09-18). A hand-deployed bot shows no such block at all.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { mkBot } from '../../../tests/fixtures/bots'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => null }))
})

let current = mkBot()

vi.mock('@/lib/queries', () => ({
  getBotWithStats: async () => current,
  getBotSlugs: async () => [],
}))
vi.mock('@/lib/screening', async (orig) => ({
  ...(await orig<typeof import('@/lib/screening')>()),
  getProvenanceForBot: async () => null,
}))

import StrategyPage from '@/app/strategies/bot/[slug]/page'

async function renderFiche() {
  render(await StrategyPage({ params: Promise.resolve({ slug: current.slug }) }))
}

describe('bot fiche — replay of the recipe on the repaired execution', () => {
  it('shows the replayed PF and trade count for a wave-1 bot', async () => {
    current = mkBot({
      slug: 'arm-atrchannel-h4-head00',
      origin: 'engine',
      engine_unit_key: 'ATRChannel|H4|data_20260802|3',
      assets: ['AVAX/USDT:USDT', 'DOGE/USDT:USDT', 'DOT/USDT:USDT', 'HBAR/USDT:USDT', 'OP/USDT:USDT', 'SEI/USDT:USDT'],
    })
    await renderFiche()
    const block = screen.getByTestId('recipe-replay')
    expect(block).toHaveTextContent(/12\/09\/2026/)
    expect(block).toHaveTextContent(/2,25/)
    expect(block).toHaveTextContent(/245 trades/)
    // The universe is named, and it is not the bot's own basket.
    expect(block).toHaveTextContent(/30 actifs/)
    expect(block).toHaveTextContent(/6 que ce bot trade/)
    expect(block).toHaveTextContent(/pas un nouveau verdict/i)
    // D-AUDIT-4: the corrected engine re-runs the FAMILIES, not this recipe;
    // nothing replaces this block automatically.
    expect(block).toHaveTextContent(/refait le tour des familles/)
    expect(block).toHaveTextContent(/à la main/)
    expect(block).not.toHaveTextContent(/rejuger/)
    expect(block).toHaveTextContent(/trouvés le 10 septembre/)
    expect(block).toHaveTextContent(/moteur utilisé pour le rejeu : be6cb2ec0e47/)
  })

  it('never speaks in gates or rejection', async () => {
    current = mkBot({
      slug: 'arm-keltnerbreak-d1-head00',
      origin: 'engine',
      engine_unit_key: 'KeltnerBreak|D1|data_20260802|3',
    })
    await renderFiche()
    const text = screen.getByTestId('recipe-replay').textContent ?? ''
    expect(text).not.toMatch(/\bportes?\b|rejet|recal|échou|trimestre|par actif/i)
  })

  it('says the recipe is not replayed yet for an engine bot outside the replay', async () => {
    current = mkBot({
      slug: 'arm-hmacross-h4-head09',
      origin: 'engine',
      engine_unit_key: 'HMAcross|H4|data_20260802|3',
    })
    await renderFiche()
    expect(screen.getByTestId('recipe-replay')).toHaveTextContent(/pas encore été rejouée/i)
  })

  it('shows nothing for a hand-deployed bot', async () => {
    current = mkBot({ slug: 'v1-spot', origin: 'manual', engine_unit_key: null })
    await renderFiche()
    expect(screen.queryByTestId('recipe-replay')).toBeNull()
  })
})
