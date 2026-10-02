// tests/app/bot-fiche-registre.test.tsx
//
// Refonte « Le registre des décisions », lot 3 (2026-10-02): the bot fiche reads like the
// maquette. Breadcrumb, regime, title, then the verdict panel (never folded, audit
// 2026-10 constat 3), then base, result and their sum. These tests pin the page-level
// composition and the copy rules; the state choice is in tests/lib/bot-verdict.test.ts.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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

const trade = (i: number, pnl: number, side: 'long' | 'short' = 'long'): Trade => ({
  id: String(i), bot_id: 'b', opened_at: `2026-05-${String(i).padStart(2, '0')}T08:00:00Z`,
  closed_at: `2026-05-${String(i).padStart(2, '0')}T20:00:00Z`, asset: 'BTC-USDC', side,
  pnl, reason: 'stop_loss_initial', is_paper: false, entry_price: null, exit_price: null,
})
const day = (date: string, capital: number): PerfDaily =>
  ({ id: date, bot_id: 'b', date, capital, pnl_day: 0, win_rate: null, profit_factor: null })

async function fiche(slug: string, over: Parameters<typeof prodBot>[1]) {
  current.bot = prodBot(slug, over)
  return render(await BotFichePage({ params: Promise.resolve({ slug }) }))
}

const text = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ')
/** Text with every space removed (elements join without one), for reading a row. */
const flat = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, '')
const flatOf = (el: Element | null) => flat(el?.textContent)

describe('bot fiche, header', () => {
  it('opens on a breadcrumb back to the fleet, then the regime, then the title', async () => {
    await fiche('v1-spot', { name: 'Croisement EMA H4 Kraken Spot', exchange: 'Kraken Spot', status: 'live', live_since: '2026-04-17T00:00:00Z' })
    const crumbs = screen.getByRole('navigation', { name: /Fil d’Ariane/ })
    expect(within(crumbs).getByRole('link', { name: 'Accueil' })).toHaveAttribute('href', '/')
    expect(within(crumbs).getByRole('link', { name: 'La flotte' })).toHaveAttribute('href', '/overview')
    expect(text(crumbs)).toMatch(/Croisement EMA H4 · Kraken$/)
    const header = screen.getByTestId('bot-header')
    expect(flatOf(header).startsWith('●Argentréel')).toBe(true)
  })

  it('puts the verdict panel right under the title, never in a fold', async () => {
    await fiche('v1-spot', { status: 'live', live_since: '2026-04-17T00:00:00Z' })
    const h1 = screen.getByRole('heading', { level: 1 })
    const panel = screen.getByTestId('verdict-panel')
    expect(h1.nextElementSibling).toBe(panel)
    expect(panel.closest('details')).toBeNull()
    expect(within(panel).getByText('Mon constat')).toBeInTheDocument()
    expect(within(panel).getByText('Ma décision et ses limites')).toBeInTheDocument()
  })

  it('real money: base, result, base + result, without a sentence explaining the base', async () => {
    const { container } = await fiche('v1-spot', { status: 'live', live_since: '2026-04-17T00:00:00Z',
      stats: { total_trades: 42, win_rate: 0.5, profit_factor: 2.82, max_drawdown: 0.022, latest_capital: 1272.73 } })
    const figures = screen.getByTestId('bot-figures')
    expect(flatOf(figures)).toContain(flat('Base de comparaison 1 000,00 €'))
    expect(flatOf(figures)).toContain(flat('Résultat +272,73 €'))
    expect(flatOf(figures)).toContain(flat('Base + résultat 1 272,73 €'))
    expect(figures.querySelector('.decoration-double')!.textContent).toMatch(/1\s272,73/)
    expect(container.textContent).not.toMatch(/Je ramène|ramené à cette échelle|base miroir/i)
  })

  it('keeps the star, says a favourite sends nothing, and shows no bell to a guest', async () => {
    await fiche('v1-spot', { status: 'live', live_since: '2026-04-17T00:00:00Z' })
    expect(screen.getByText('Un favori n’envoie aucun message.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Suivre en direct/ })).toBeNull()
  })

  it('names no author anywhere', async () => {
    const { container } = await fiche('orb-bf25', { status: 'live', live_since: '2026-04-26T00:00:00Z' })
    expect(container.textContent).not.toMatch(/Dessombs/)
  })
})

describe('bot fiche, the ORB case: rule crossed, decision kept', () => {
  const orb = { status: 'live' as const, live_since: '2026-04-26T00:00:00Z',
    stats: { total_trades: 284, win_rate: 0.4, profit_factor: 0.99, max_drawdown: 0.291, latest_capital: 982.32 } }

  it('says the rule is crossed, in the third person, with the decision quoted beside it', async () => {
    await fiche('orb-bf25', orb)
    const panel = screen.getByTestId('verdict-panel')
    expect(panel.dataset.state).toBe('breach')
    expect(panel.className).toContain('border-negative')
    expect(text(panel)).toMatch(/Règle d’arrêt franchie/)
    expect(text(panel)).toMatch(/Ce bot dépasse les limites de baisse et de rentabilité que j’avais publiées\./)
    expect(screen.getByTestId('verdict-decision').textContent).toBe('Le 25 septembre, je le garde.')
    expect(within(panel).getByTestId('verdict-review')).toBeInTheDocument()
    expect(within(panel).getByRole('link', { name: /Lire la règle et ma décision ↓/ })).toHaveAttribute('href', '#regles')
  })

  it('shows each value against its threshold, the full decision behind « Lire ma décision complète »', async () => {
    await fiche('orb-bf25', orb)
    const rules = document.getElementById('regles')!
    expect(flatOf(rules)).toContain(flat('Pire baisse Limite publiée : 20 % 29,1 %'))
    expect(flatOf(rules)).toContain(flat('Facteur de profit Attendu : au moins 1,3 0,99'))
    const summary = within(rules).getByText('Lire ma décision complète')
    expect(summary.tagName).toBe('SUMMARY')
    expect(text(summary.closest('details'))).toMatch(/je préfère l’écrire ici que réécrire la règle/)
  })
})

describe('bot fiche, the trade register', () => {
  it('counts the sides in words, not « 42L · 0S », and disables an empty side', async () => {
    const trades = [trade(3, 4), trade(2, -2), trade(1, 5)]
    await fiche('v1-spot', { status: 'live', live_since: '2026-04-17T00:00:00Z',
      all_trades: trades, recent_trades: trades,
      stats: { total_trades: 3, win_rate: 0.66, profit_factor: 4.5, max_drawdown: 0.01, latest_capital: 1007 } })
    const register = document.getElementById('trades')!
    expect(text(register)).toMatch(/3 trades clos · 3 long · 0 short/)
    expect(text(register)).not.toMatch(/\dL · \dS/)
    expect(within(register).getByRole('button', { name: /^Short/ })).toBeDisabled()
  })

  it('prints the cumul after each trade from the starting capital, and a total', async () => {
    const trades = [trade(3, 4), trade(2, -2), trade(1, 5)]
    await fiche('v1-spot', { status: 'live', live_since: '2026-04-17T00:00:00Z',
      all_trades: trades, recent_trades: trades, perf_daily: [day('2026-05-03', 1007)],
      stats: { total_trades: 3, win_rate: 0.66, profit_factor: 4.5, max_drawdown: 0.01, latest_capital: 1007 } })
    const rows = document.querySelectorAll('#trades table tbody tr')
    expect([...rows].map(r => text(r).match(/1 0\d\d,\d\d €/)?.[0])).toEqual(['1 005,00 €', '1 003,00 €', '1 007,00 €'])
    expect(flatOf(document.querySelector('[data-testid="trades-total"]'))).toBe(flat('Total des 3 trades +7,00 € 1 007,00 €'))
    expect(screen.getAllByText('Stop').length).toBeGreaterThan(0)
  })
})

describe('bot fiche, zero trade (audit 2026-10, constat 6)', () => {
  const dormant = { status: 'paper' as const, all_trades: [], recent_trades: [], perf_daily: [],
    stats: { total_trades: 0, win_rate: 0, profit_factor: 0, max_drawdown: 0, latest_capital: 1000 } }

  it('« — » in the figures, nothing coloured, the waiting sentence in the panel', async () => {
    await fiche('v1-hl', dormant)
    const figures = screen.getByTestId('bot-figures')
    expect(flatOf(figures)).toContain(flat('Résultat de la simulation — Départ + résultat —'))
    expect(figures.innerHTML).not.toMatch(/text-negative|text-positive/)
    const panel = screen.getByTestId('verdict-panel')
    expect(panel.dataset.state).toBe('no-trade')
    expect(text(panel)).toMatch(/il attend son signal/)
    expect(text(panel)).not.toMatch(/erreur|panne|bug/i)
    expect(document.body.textContent!.match(/il attend son signal/g)).toHaveLength(1)
  })

  it('the published criteria read « pas encore mesurable », none validated on nothing', async () => {
    await fiche('v1-hl', dormant)
    const rules = document.getElementById('regles')!
    expect(within(rules).getAllByText('pas encore mesurable')).toHaveLength(3)
    expect(text(rules)).toMatch(/0 critère sur 4 atteint/)
  })

  // Was tests/components/BotFicheDormancy.test.tsx (fix round 1, Finding 2): the
  // dormancy note of a bot with a documented envelope is printed once, now in the panel.
  it('prints a documented dormancy note exactly once', async () => {
    await fiche('funding-rev-long', dormant)
    expect(screen.getAllByText(/attend des signaux extrêmes/)).toHaveLength(1)
    expect(text(screen.getByTestId('verdict-panel'))).toMatch(/attend des signaux extrêmes/)
  })
})
