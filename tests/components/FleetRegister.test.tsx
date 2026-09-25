import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import FleetRegister from '@/components/FleetRegister'
import { EMPTY_FILTERS } from '@/lib/bot-filters'
import { FIXTURE_FLEET, mkBot, prodBot } from '../fixtures/bots'

// Lot 4 of the design audit (2026-09-25, conception §5.2): ONE table for the whole
// register, every timeframe in it, sorted by history (trades descending, C7),
// with the timeframe as a column and as a filter. The per-timeframe sections
// (« H4 : 55 stratégies ») are gone: a visitor looks for a bot, not a horizon.
// Bots under 20 trades fold under the table (« En rodage »), the untraded ones
// under their own line, the archived ones last.
vi.mock('next/navigation', () => ({
  usePathname: () => '/overview',
}))

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => null }))
  window.history.replaceState(null, '', '/overview')
})

const REGISTER_FIXTURE = FIXTURE_FLEET.filter(b => b.status !== 'live')
const stats = (total_trades: number, latest_capital = 1000) =>
  ({ total_trades, win_rate: 0.5, profit_factor: 1.2, max_drawdown: 0.05, latest_capital })

function rowsOf(table: HTMLElement): string[] {
  return [...table.querySelectorAll('tbody tr')].map(tr => tr.querySelector('a')!.textContent!)
}

describe('FleetRegister — one table, sorted by history', () => {
  it('never renders a real-money section, even when handed a live bot', () => {
    render(<FleetRegister bots={FIXTURE_FLEET} initialState={EMPTY_FILTERS} />)
    expect(screen.queryByTestId('fleet-real')).toBeNull()
  })

  it('lists every proven bot in one table, trades descending, whatever its timeframe', () => {
    const bots = [
      mkBot({ name: 'H4 Trente', timeframe: 'H4', stats: stats(30) }),
      mkBot({ name: 'H1 Cent', timeframe: 'H1', stats: stats(100) }),
      mkBot({ name: 'D1 Cinquante', timeframe: 'D1', stats: stats(50) }),
      mkBot({ name: 'H4 Douze', timeframe: 'H4', stats: stats(12) }),
    ]
    render(<FleetRegister bots={bots} initialState={EMPTY_FILTERS} />)
    const table = screen.getByTestId('fleet-table')
    expect(rowsOf(table)).toEqual(['H1 Cent', 'D1 Cinquante', 'H4 Trente'])
    expect(screen.queryByTestId('fleet-tf-H4')).toBeNull()
    expect(within(table).getAllByRole('columnheader').map(th => th.textContent)).toContain('TF')
  })

  it('folds bots between 1 and 19 trades under the table, closed, headed by their count', () => {
    const bots = [
      mkBot({ name: 'Prouvé', stats: stats(40) }),
      mkBot({ name: 'Rodage A', stats: stats(7) }),
      mkBot({ name: 'Rodage B', stats: stats(19) }),
      mkBot({ name: 'Jamais', stats: stats(0) }),
    ]
    render(<FleetRegister bots={bots} initialState={EMPTY_FILTERS} />)
    const rodage = screen.getByTestId('fleet-rodage') as HTMLDetailsElement
    expect(rodage.open).toBe(false)
    expect(rodage.querySelector('summary')!.textContent).toMatch(/En rodage · 2 bots/)
    expect(rowsOf(rodage.querySelector('table')!)).toEqual(['Rodage B', 'Rodage A'])
    expect(rowsOf(screen.getByTestId('fleet-table'))).toEqual(['Prouvé'])
  })

  it('lists the bots that never traded under their own closed line, not in the table', () => {
    const bots = [
      mkBot({ name: 'Prouvé', stats: stats(40) }),
      mkBot({ name: 'Jamais Un', stats: stats(0) }),
      mkBot({ name: 'Jamais Deux', stats: stats(0) }),
    ]
    render(<FleetRegister bots={bots} initialState={EMPTY_FILTERS} />)
    const untraded = screen.getByTestId('fleet-untraded') as HTMLDetailsElement
    expect(untraded.open).toBe(false)
    expect(untraded.querySelector('summary')!.textContent).toMatch(/Sans trade encore · 2 bots/)
    expect(within(untraded).getByRole('link', { name: 'Jamais Un' })).toBeTruthy()
    expect(within(screen.getByTestId('fleet-table')).queryByText('Jamais Un')).toBeNull()
    expect(screen.queryByTestId('fleet-rodage')).toBeNull()
  })

  it('omits the table when nothing is proven, without an empty frame', () => {
    render(<FleetRegister bots={[mkBot({ stats: stats(3) })]} initialState={EMPTY_FILTERS} />)
    expect(screen.queryByTestId('fleet-table')).toBeNull()
    expect(screen.getByTestId('fleet-rodage')).toBeTruthy()
  })

  it('collapses archived bots but keeps them present', () => {
    render(<FleetRegister bots={REGISTER_FIXTURE} initialState={EMPTY_FILTERS} />)
    const archived = screen.getByTestId('fleet-archived') as HTMLDetailsElement
    expect(archived.open).toBe(false)
    expect(within(archived).getByRole('link', { name: /Chandelier/ })).toBeTruthy()
  })
})

describe('FleetRegister — the experiment line', () => {
  it('counts the engine-born bots apart from the hand-deployed ones, and links the protocol', () => {
    const bots = [
      mkBot({ name: 'Moteur A', status: 'paper', engine_unit_key: 'A|H4|d|1' }),
      mkBot({ name: 'Moteur B', status: 'paper', engine_unit_key: 'B|H4|d|1' }),
      mkBot({ name: 'Main', status: 'paper', engine_unit_key: null }),
      mkBot({ name: 'Archivé', status: 'archived', engine_unit_key: 'C|H4|d|1' }),
    ]
    render(<FleetRegister bots={bots} initialState={EMPTY_FILTERS} />)
    const line = screen.getByTestId('fleet-experiment')
    expect(line.textContent).toMatch(/2 configurations issues du gantelet/)
    expect(line.textContent).toMatch(/1 bot déployé à la main/)
    expect(within(line).getByRole('link', { name: /protocole/i }).getAttribute('href')).toBe('/strategies#comment-je-decide')
  })
})

describe('FleetRegister — filters', () => {
  it('shows a count next to every family option', () => {
    render(<FleetRegister bots={REGISTER_FIXTURE} initialState={EMPTY_FILTERS} />)
    expect(screen.getByRole('button', { name: /Portage \(\d+\)/ })).toBeTruthy()
  })

  it('offers the timeframes as a facet, counted, and filters the table with it', () => {
    const bots = [
      mkBot({ name: 'H4 Un', timeframe: 'H4', stats: stats(30) }),
      mkBot({ name: 'H1 Un', timeframe: 'H1', stats: stats(40) }),
      mkBot({ name: 'H1 Deux', timeframe: 'H1', stats: stats(25) }),
    ]
    render(<FleetRegister bots={bots} initialState={EMPTY_FILTERS} />)
    const h1 = screen.getByRole('button', { name: 'H1 (2)' })
    fireEvent.click(h1)
    expect(h1).toHaveAttribute('aria-pressed', 'true')
    expect(rowsOf(screen.getByTestId('fleet-table'))).toEqual(['H1 Un', 'H1 Deux'])
    expect(window.location.search).toContain('tf=H1')
  })

  it('names the responsible filter when a selection returns nothing', () => {
    render(<FleetRegister bots={REGISTER_FIXTURE} initialState={{ ...EMPTY_FILTERS, family: ['carry'], timeframe: ['M15'] }} />)
    expect(screen.getByTestId('fleet-empty')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Retirer les filtres' }))
    expect(screen.queryByTestId('fleet-empty')).toBeNull()
  })

  it('no longer offers the « Où ça tourne » facet, nor a sort control', () => {
    render(<FleetRegister bots={REGISTER_FIXTURE} initialState={EMPTY_FILTERS} />)
    expect(screen.queryByText(/Où ça tourne/)).toBeNull()
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.queryByText(/^Trier/)).toBeNull()
  })

  it('re-parses filter state from the URL on popstate (back/forward navigation)', () => {
    render(<FleetRegister bots={REGISTER_FIXTURE} initialState={EMPTY_FILTERS} />)
    const carry = screen.getByRole('button', { name: /Portage \(\d+\)/ })
    fireEvent.click(carry)
    expect(carry).toHaveAttribute('aria-pressed', 'true')
    window.history.replaceState(null, '', '/overview')
    act(() => { window.dispatchEvent(new PopStateEvent('popstate')) })
    expect(screen.getByRole('button', { name: /Portage \(\d+\)/ })).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('FleetRegister — what a row shows', () => {
  it('shows PF and P&L on the row via BotTable, not just the trade count', () => {
    const bot = prodBot('macdvolume-bf11', {
      name: 'MACD Volume H4 BF',
      stats: { total_trades: 31, win_rate: 0.548, profit_factor: 1.42, max_drawdown: 0.072, latest_capital: 1000.62 },
    })
    render(<FleetRegister bots={[bot]} initialState={EMPTY_FILTERS} />)
    const table = screen.getByTestId('fleet-table')
    expect(table.textContent).toMatch(/1,42/)
    expect(table.textContent).toMatch(/0,62/)
  })
})
