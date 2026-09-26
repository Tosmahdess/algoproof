// Lot 5 of the design audit (2026-09-25, conception §5.3): /strategies opens on
// the engine's funnel (the same block as the home), then the folded method, then
// the register whose cards say « pas encore de bot » as a state, not a figure.
// The concept page lists what runs it by history (C7) and folds the small
// samples (C6), and offers the lab replay when a preset exists.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { prodBot, mkBot } from '../fixtures/bots'

vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('unexpected notFound') },
  permanentRedirect: (to: string) => { throw new Error(`unexpected redirect to ${to}`) },
}))

const bots = vi.hoisted(() => ({ current: [] as unknown[] }))
vi.mock('@/lib/queries', () => ({
  getAllBotsWithStats: async () => bots.current,
  getBotSlugs: async () => [],
}))
vi.mock('@/lib/engine-search-space', () => ({ getSearchSpace: async () => null }))
const FUNNEL = { n_swept: 41_333_092, n_judged: 1_754_244, n_no_go: 1_490_926, n_marginal: 259_782, n_go: 3_536, n_promoted: 96, n_live: 3 }
vi.mock('@/lib/funnel', () => ({ getFunnelCounts: async () => FUNNEL }))

import StrategiesIndexPage from '@/app/strategies/page'
import ConceptPage from '@/app/strategies/[concept]/page'

describe('/strategies — the funnel first, then the method, then the register', () => {
  it('renders the engine funnel before the folded method, and the method before the register', async () => {
    bots.current = [prodBot('v1-spot', { status: 'live' }), prodBot('macdvolume-bf11')]
    const { container } = render(await StrategiesIndexPage())
    const html = container.innerHTML
    const at = (id: string) => html.indexOf(`data-testid="${id}"`)
    expect(at('home-funnel')).toBeGreaterThan(-1)
    expect(at('home-funnel')).toBeLessThan(at('index-gauntlet'))
    expect(at('index-gauntlet')).toBeLessThan(at('strategies-register'))
    // Since 2026-09-26 the fleet is not recounted here: the introduction links it.
    expect(screen.queryByTestId('home-fleet-line')).toBeNull()
  })

  it('renders no funnel when the counts are missing, and still the rest', async () => {
    const funnel = await import('@/lib/funnel')
    const spy = vi.spyOn(funnel, 'getFunnelCounts').mockResolvedValueOnce(null)
    bots.current = []
    render(await StrategiesIndexPage())
    expect(screen.queryByTestId('home-funnel')).toBeNull()
    expect(screen.getByTestId('index-gauntlet')).toBeTruthy()
    spy.mockRestore()
  })

  it('says « pas encore de bot » as a state: muted, not mono, not « aucun bot »', async () => {
    bots.current = []
    const { container } = render(await StrategiesIndexPage())
    expect(container.textContent).not.toMatch(/aucun bot/)
    const state = screen.getAllByText('pas encore de bot')[0]
    expect(state.className).toMatch(/text-muted/)
    expect(state.className).not.toMatch(/font-mono/)
  })

  it('heads each family with its strategy count and its bot count', async () => {
    bots.current = [prodBot('v1-spot', { status: 'live' }), prodBot('emacross-eur-usd')]
    render(await StrategiesIndexPage())
    const trend = screen.getByTestId('family-trend')
    expect(within(trend).getByRole('heading', { level: 2 }).textContent!.replace(/ /g, ' ')).toMatch(/Suivi de tendance · \d+ stratégies · 2 bots/)
  })
})

describe('/strategies/[concept] — « Ce qui tourne chez moi » by history (C7), small samples folded (C6)', () => {
  it('orders the incarnations by trades, whatever the timeframe, and folds those under 20', async () => {
    bots.current = [
      prodBot('v1-spot', { name: 'EMA Vingt', timeframe: 'H4', stats: { total_trades: 20, win_rate: 0.5, profit_factor: 1.1, max_drawdown: 0.05, latest_capital: 1010 } }),
      prodBot('v1-hl', { name: 'EMA Quatre-vingts', timeframe: 'H1', stats: { total_trades: 80, win_rate: 0.5, profit_factor: 1.1, max_drawdown: 0.05, latest_capital: 1010 } }),
      prodBot('emacross-eur-usd', { name: 'EMA Sept', timeframe: 'H4', stats: { total_trades: 7, win_rate: 0.5, profit_factor: 1.1, max_drawdown: 0.05, latest_capital: 1010 } }),
    ]
    render(await ConceptPage({ params: Promise.resolve({ concept: 'ema-cross' }) }))
    const section = screen.getByTestId('concept-incarnations')
    const table = within(section).getByTestId('concept-table')
    const rows = [...table.querySelectorAll('tbody tr')].map(tr => tr.querySelector('a')!.textContent)
    expect(rows).toEqual(['EMA Quatre-vingts', 'EMA Vingt'])
    const rodage = within(section).getByTestId('concept-rodage') as HTMLDetailsElement
    expect(rodage.open).toBe(false)
    expect(rodage.querySelector('summary')!.textContent).toMatch(/En rodage · 1 bot/)
    expect(within(rodage).getAllByText('EMA Sept').length).toBeGreaterThan(0)
  })

  it('offers the lab, and the replay of my real config only when a preset exists', async () => {
    bots.current = []
    render(await ConceptPage({ params: Promise.resolve({ concept: 'ema-cross' }) }))
    expect(screen.getByRole('link', { name: /Tester cette stratégie dans le labo/ })).toBeTruthy()
    expect(screen.queryByRole('link', { name: /Rejouer dans le labo/ })).toBeNull()
  })
})
