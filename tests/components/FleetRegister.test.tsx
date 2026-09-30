import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import FleetRegister from '@/components/FleetRegister'
import { EMPTY_FILTERS } from '@/lib/bot-filters'
import { FIXTURE_FLEET, mkBot, prodBot } from '../fixtures/bots'

// Lot 4 of the design audit (2026-09-25, conception §5.2): ONE table for the whole
// register, every timeframe in it, sorted by history (trades descending, C7),
// with the timeframe as a column and as a filter. The per-timeframe sections
// (« H4 : 55 stratégies ») are gone: a visitor looks for a bot, not a horizon.
// Since 2026-09-30 the bots under 20 trades and the untraded ones are rows of the
// same table, ranked after the proven ones under every sort; archived fold last.
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

  it('lists every bot in one table, trades descending, whatever its timeframe', () => {
    const bots = [
      mkBot({ name: 'H4 Trente', timeframe: 'H4', stats: stats(30) }),
      mkBot({ name: 'H1 Cent', timeframe: 'H1', stats: stats(100) }),
      mkBot({ name: 'D1 Cinquante', timeframe: 'D1', stats: stats(50) }),
      mkBot({ name: 'H4 Douze', timeframe: 'H4', stats: stats(12) }),
    ]
    render(<FleetRegister bots={bots} initialState={EMPTY_FILTERS} />)
    const table = screen.getByTestId('fleet-table')
    expect(rowsOf(table)).toEqual(['H1 Cent', 'D1 Cinquante', 'H4 Trente', 'H4 Douze'])
    expect(screen.queryByTestId('fleet-tf-H4')).toBeNull()
    expect(within(table).getAllByRole('columnheader').map(th => th.textContent)).toContain('TF')
  })

  it('keeps the bots under 20 trades IN the table, after the proven ones, then the untraded (2026-09-30)', () => {
    const bots = [
      mkBot({ name: 'Rodage A', stats: stats(7) }),
      mkBot({ name: 'Jamais', stats: stats(0) }),
      mkBot({ name: 'Prouvé', stats: stats(40) }),
      mkBot({ name: 'Rodage B', stats: stats(19) }),
    ]
    render(<FleetRegister bots={bots} initialState={EMPTY_FILTERS} />)
    expect(rowsOf(screen.getByTestId('fleet-table'))).toEqual(['Prouvé', 'Rodage B', 'Rodage A', 'Jamais'])
    expect(screen.queryByTestId('fleet-rodage')).toBeNull()
    expect(screen.queryByTestId('fleet-untraded')).toBeNull()
  })

  it('renders the table even when nothing is proven yet', () => {
    render(<FleetRegister bots={[mkBot({ name: 'Petit', stats: stats(3) })]} initialState={EMPTY_FILTERS} />)
    expect(rowsOf(screen.getByTestId('fleet-table'))).toEqual(['Petit'])
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
    expect(line.textContent).toMatch(/2 configurations qui ont passé mes quatre épreuves \(le gantelet\)/)
    expect(line.textContent).toMatch(/1 bot déployé à la main/)
    expect(within(line).getByRole('link', { name: /protocole/i }).getAttribute('href')).toBe('/strategies#comment-je-decide')
  })
})

function select(name: RegExp): HTMLSelectElement {
  return screen.getByRole('combobox', { name }) as HTMLSelectElement
}

describe('FleetRegister — filters', () => {
  it('offers each filter as ONE list, with a count next to every option', () => {
    render(<FleetRegister bots={REGISTER_FIXTURE} initialState={EMPTY_FILTERS} />)
    const family = select(/Famille/)
    expect([...family.options].some(o => /^Portage \(\d+\)$/.test(o.textContent!))).toBe(true)
    expect(select(/Horizon/)).toBeTruthy()
    expect(select(/Sens/)).toBeTruthy()
    expect(select(/Trier/)).toBeTruthy()
  })

  it('has no fold of its own: the sticky bar is the only drilldown on a phone', () => {
    render(<FleetRegister bots={REGISTER_FIXTURE} initialState={EMPTY_FILTERS} />)
    const controls = screen.getByTestId('fleet-filters')
    expect(controls.tagName).not.toBe('DETAILS')
    expect(controls.closest('details')).toBeNull()
  })

  it('filters the table by timeframe from its list, and writes it in the URL', () => {
    const bots = [
      mkBot({ name: 'H4 Un', timeframe: 'H4', stats: stats(30) }),
      mkBot({ name: 'H1 Un', timeframe: 'H1', stats: stats(40) }),
      mkBot({ name: 'H1 Deux', timeframe: 'H1', stats: stats(25) }),
    ]
    render(<FleetRegister bots={bots} initialState={EMPTY_FILTERS} />)
    const tf = select(/Horizon/)
    expect([...tf.options].map(o => o.textContent)).toContain('H1 (2)')
    fireEvent.change(tf, { target: { value: 'H1' } })
    expect(tf.value).toBe('H1')
    expect(rowsOf(screen.getByTestId('fleet-table'))).toEqual(['H1 Un', 'H1 Deux'])
    expect(window.location.search).toContain('tf=H1')
  })

  it('names the responsible filter when a selection returns nothing', () => {
    render(<FleetRegister bots={REGISTER_FIXTURE} initialState={{ ...EMPTY_FILTERS, family: ['carry'], timeframe: ['M15'] }} />)
    expect(screen.getByTestId('fleet-empty')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Retirer les filtres' }))
    expect(screen.queryByTestId('fleet-empty')).toBeNull()
  })

  it('no longer offers the « Où ça tourne » facet', () => {
    render(<FleetRegister bots={REGISTER_FIXTURE} initialState={EMPTY_FILTERS} />)
    expect(screen.queryByText(/Où ça tourne/)).toBeNull()
  })

  it('re-parses filter state from the URL on popstate (back/forward navigation)', () => {
    render(<FleetRegister bots={REGISTER_FIXTURE} initialState={EMPTY_FILTERS} />)
    fireEvent.change(select(/Famille/), { target: { value: 'carry' } })
    expect(select(/Famille/).value).toBe('carry')
    window.history.replaceState(null, '', '/overview')
    act(() => { window.dispatchEvent(new PopStateEvent('popstate')) })
    expect(select(/Famille/).value).toBe('')
  })
})

describe('FleetRegister — sort', () => {
  const pf = (total_trades: number, profit_factor: number, latest_capital = 1000) =>
    ({ total_trades, win_rate: 0.5, profit_factor, max_drawdown: 0.05, latest_capital })

  it('sorts by profit factor, best first, the bots under 20 trades still after the proven ones', () => {
    const bots = [
      mkBot({ name: 'Solide', stats: pf(100, 1.2) }),
      mkBot({ name: 'Chanceux', stats: pf(3, 9) }),
      mkBot({ name: 'Fort', stats: pf(40, 1.8) }),
      mkBot({ name: 'Jamais', stats: pf(0, 0) }),
    ]
    render(<FleetRegister bots={bots} initialState={EMPTY_FILTERS} />)
    fireEvent.change(select(/Trier/), { target: { value: 'profit_factor' } })
    expect(rowsOf(screen.getByTestId('fleet-table'))).toEqual(['Fort', 'Solide', 'Chanceux', 'Jamais'])
    expect(window.location.search).toContain('sort=profit_factor')
    expect(screen.getByTestId('fleet-sort-line').textContent).toMatch(/triés par facteur de profit/)
  })

  it('sorts by percentage gain on each bot\'s own start capital', () => {
    const bots = [
      mkBot({ name: 'Petit', start_capital: 400, stats: pf(30, 1, 500) }),
      mkBot({ name: 'Gros', start_capital: 1000, stats: pf(30, 1, 1300) }),
      mkBot({ name: 'Perdant', start_capital: 1000, stats: pf(30, 1, 900) }),
    ]
    render(<FleetRegister bots={bots} initialState={{ ...EMPTY_FILTERS, sort: 'pct' }} />)
    expect(rowsOf(screen.getByTestId('fleet-table'))).toEqual(['Gros', 'Petit', 'Perdant'])
  })

  it('is not an active filter: choosing a sort does not light the filter count', () => {
    render(<FleetRegister bots={REGISTER_FIXTURE} initialState={EMPTY_FILTERS} />)
    fireEvent.change(select(/Trier/), { target: { value: 'pct' } })
    expect(screen.queryByRole('button', { name: 'Tout effacer' })).toBeNull()
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
