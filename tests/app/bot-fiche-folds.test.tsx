// tests/app/bot-fiche-folds.test.tsx
//
// 2026-09-19 (D057): the bot fiche on a phone. What a reader comes for
// (metrics, curve) was not buried, unlike /investir and /strategies; the mass
// was AFTER it. This file pins the page-level decisions: the recent trades
// show five rows on a phone, the share block folds on every screen, the
// simulator comes after what the bot does, and a live bot states its
// real-money start once.
import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { prodBot } from '../fixtures/bots'
import type { PerfDaily, Trade } from '@/lib/types'

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

const trade = (i: number): Trade => ({
  id: String(i), bot_id: 'b', opened_at: `2026-05-${String(i).padStart(2, '0')}T08:00:00Z`,
  closed_at: `2026-05-${String(i).padStart(2, '0')}T20:00:00Z`, asset: 'BTC/USDT', side: 'long',
  pnl: 5, reason: 'EMA cross', is_paper: false, entry_price: null, exit_price: null,
})
const day = (i: number): PerfDaily => ({
  id: String(i), bot_id: 'b', date: `2026-05-${String(i).padStart(2, '0')}`,
  capital: 1000 + i, pnl_day: 1, win_rate: null,
} as PerfDaily)

async function monter(nTrades: number, nShorts = 0) {
  const trades = Array.from({ length: nTrades }, (_, i) =>
    i < nShorts ? { ...trade(i + 1), side: 'short' as const } : trade(i + 1))
  current.bot = prodBot('v1-spot', {
    status: 'live', live_since: '2026-04-17T00:00:00Z',
    recent_trades: trades, all_trades: trades,
    perf_daily: Array.from({ length: 5 }, (_, i) => day(i + 1)),
  })
  return render(await BotFichePage({ params: Promise.resolve({ slug: 'v1-spot' }) }))
}

const titreTrades = () => screen.getByRole('heading', { level: 2, name: /Trades récents/ })

describe('/strategies/bot/[slug] — recent trades on a phone', () => {
  it('shows five rows on a phone, says so, and offers the rest', async () => {
    await monter(20)
    // The counter follows what each screen shows.
    expect(within(titreTrades()).getByText(/5 sur 20/).className).toContain('sm:hidden')
    expect(within(titreTrades()).getByText(/^\(20 affichés/).className).toContain('hidden sm:inline')
    const voir = screen.getByRole('button', { name: /Voir les 20 derniers/ })
    expect(voir.className).toContain('sm:hidden')

    fireEvent.click(voir)

    expect(screen.queryByRole('button', { name: /Voir les 20 derniers/ })).toBeNull()
    expect(within(titreTrades()).queryByText(/5 sur 20/)).toBeNull()
    const tableau = titreTrades().parentElement!
    within(tableau).getAllByRole('row').forEach(r => expect(r.className).not.toContain('max-sm:hidden'))
  })

  it('follows a filter down to five rows or fewer, and back', async () => {
    // Final review 2026-09-19: the limit is recomputed from what the filter
    // shows; the choice « all of them » is not needed to get the button back.
    await monter(20, 3)
    fireEvent.click(screen.getByRole('button', { name: /^Short/ }))
    expect(screen.queryByRole('button', { name: /Voir les/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /^Tous/ }))
    expect(screen.getByRole('button', { name: /Voir les 20 derniers/ })).toBeTruthy()
  })

  it('offers nothing when five rows or fewer', async () => {
    await monter(4)
    expect(screen.queryByRole('button', { name: /Voir les/ })).toBeNull()
    expect(within(titreTrades()).queryByText(/sur 4/)).toBeNull()
  })
})

describe('/strategies/bot/[slug] — share, order, live date', () => {
  it('folds the share block on every screen, in a closed <details>', async () => {
    await monter(3)
    const titre = screen.getByRole('heading', { level: 2, name: /Partager ce bot/ })
    const details = titre.closest('details')!
    expect(details).toBeTruthy()
    expect(details.open).toBe(false)
    expect(titre.closest('summary')).toBeTruthy()
    expect(details.textContent).toContain('/embed/v1-spot')
  })

  it('puts the capital simulator after what the bot does', async () => {
    await monter(3)
    const simulateur = screen.getByText(/Et sur mon capital/)
    const fonctionnel = screen.getByText(/Fonctionnel/)
    expect(fonctionnel.compareDocumentPosition(simulateur) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('states the real-money start once, on the provenance line', async () => {
    const { container } = await monter(3)
    const dates = [...(container.textContent ?? '').matchAll(/En argent réel depuis le/g)]
    expect(dates).toHaveLength(1)
  })
})
