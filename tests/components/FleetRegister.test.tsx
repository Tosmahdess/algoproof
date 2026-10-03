import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import FleetRegister from '@/components/FleetRegister'
import { EMPTY_FILTERS } from '@/lib/bot-filters'
import { FIXTURE_FLEET, mkBot, prodBot } from '../fixtures/bots'

// Refonte « registre », lot 4 (owner decision, 2026-10-02): ONE list, from the
// best result to the least good. The bots under 20 trades are rows of it, each
// labelled « rodage »; they no longer form a tier after the proven ones. A bot
// without a trade goes last with « — » and no colour. Archived bots fold last.
// Until then (2026-09-25 to 2026-10-02) the list was sorted by history and cut
// in three tiers; the tests that pinned that order were rewritten here.
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
function rowOf(table: HTMLElement, name: string): HTMLElement {
  return [...table.querySelectorAll<HTMLElement>('tbody tr')].find(tr => tr.querySelector('a')!.textContent === name)!
}

describe('FleetRegister — one list, from the best result to the least good', () => {
  it('never renders a real-money section, even when handed a live bot', () => {
    render(<FleetRegister bots={FIXTURE_FLEET} initialState={EMPTY_FILTERS} />)
    expect(screen.queryByTestId('fleet-real')).toBeNull()
  })

  it('lists every bot in one list, best result first, whatever its timeframe, in three columns', () => {
    const bots = [
      mkBot({ name: 'H4 Trente', timeframe: 'H4', stats: stats(30, 1030) }),
      mkBot({ name: 'H1 Cent', timeframe: 'H1', stats: stats(100, 1100) }),
      mkBot({ name: 'D1 Cinquante', timeframe: 'D1', stats: stats(50, 1050) }),
      mkBot({ name: 'H4 Douze', timeframe: 'H4', stats: stats(12, 1200) }),
    ]
    render(<FleetRegister bots={bots} initialState={EMPTY_FILTERS} />)
    const table = screen.getByTestId('fleet-table')
    expect(rowsOf(table)).toEqual(['H4 Douze', 'H1 Cent', 'D1 Cinquante', 'H4 Trente'])
    expect(screen.queryByTestId('fleet-tf-H4')).toBeNull()
    const headers = within(table).getAllByRole('columnheader').map(th => th.textContent)
    expect(headers.slice(0, 3)).toEqual(['Bot et marché', 'État et décision', 'Résultat depuis le départ'])
    expect(screen.getByTestId('fleet-sort-line').textContent).toMatch(/du meilleur résultat au moins bon/)
  })

  it('ranks the bots in rodage among the others, each labelled, and puts the untraded last with « — » and no colour', () => {
    const bots = [
      mkBot({ name: 'Rodage A', stats: stats(7, 1050) }),
      mkBot({ name: 'Jamais', stats: stats(0) }),
      mkBot({ name: 'Prouvé', stats: stats(40, 1020) }),
      mkBot({ name: 'Rodage B', stats: stats(19, 990) }),
    ]
    render(<FleetRegister bots={bots} initialState={EMPTY_FILTERS} />)
    const table = screen.getByTestId('fleet-table')
    expect(rowsOf(table)).toEqual(['Rodage A', 'Prouvé', 'Rodage B', 'Jamais'])
    expect(within(rowOf(table, 'Rodage A')).getByTestId('fleet-rodage-tag')).toBeTruthy()
    expect(within(rowOf(table, 'Rodage B')).getByTestId('fleet-rodage-tag')).toBeTruthy()
    expect(within(rowOf(table, 'Prouvé')).queryByTestId('fleet-rodage-tag')).toBeNull()
    const jamais = rowOf(table, 'Jamais')
    expect(jamais.textContent).toMatch(/—/)
    expect(jamais.textContent).not.toMatch(/€/)
    expect(jamais.innerHTML).not.toMatch(/text-negative|text-positive/)
    // No sparkline; the regime badge's drawn mark is not one (drawn-icons.test.tsx).
    expect(jamais.querySelector('svg:not([data-mark])')).toBeNull()
    expect(screen.queryByTestId('fleet-rodage')).toBeNull()
    expect(screen.queryByTestId('fleet-untraded')).toBeNull()
  })

  it('renders the list even when nothing is proven yet', () => {
    render(<FleetRegister bots={[mkBot({ name: 'Petit', stats: stats(3) })]} initialState={EMPTY_FILTERS} />)
    expect(rowsOf(screen.getByTestId('fleet-table'))).toEqual(['Petit'])
  })

  it('collapses archived bots but keeps them present, outside the ranking', () => {
    render(<FleetRegister bots={REGISTER_FIXTURE} initialState={EMPTY_FILTERS} />)
    const archived = screen.getByTestId('fleet-archived') as HTMLDetailsElement
    expect(archived.open).toBe(false)
    expect(within(archived).getByRole('link', { name: /Chandelier/ })).toBeTruthy()
    expect(rowsOf(screen.getByTestId('fleet-table'))).not.toContain('Chandelier Exit H4 BF')
  })
})

describe('FleetRegister — a long list, never a fold', () => {
  const many = (n: number) => Array.from({ length: n }, (_, i) =>
    mkBot({ name: `Bot ${String(i + 1).padStart(3, '0')}`, stats: stats(30, 2000 - i) }))

  it('shows the first 50 rows, then « Voir les N suivants », down to the last loser', () => {
    render(<FleetRegister bots={many(120)} initialState={EMPTY_FILTERS} />)
    const table = screen.getByTestId('fleet-table')
    expect(rowsOf(table)).toHaveLength(50)
    expect(screen.getByTestId('fleet-shown').textContent).toMatch(/50 bots affichés sur 120/)
    fireEvent.click(screen.getByRole('button', { name: 'Voir les 50 suivants' }))
    expect(rowsOf(table)).toHaveLength(100)
    // The keyboard goes on from where the list grew.
    expect(document.activeElement?.textContent).toBe('Bot 051')
    fireEvent.click(screen.getByRole('button', { name: 'Voir les 20 suivants' }))
    expect(rowsOf(table)).toHaveLength(120)
    expect(rowsOf(table).at(-1)).toBe('Bot 120')
    expect(screen.queryByTestId('fleet-more')).toBeNull()
    expect(table.closest('details')).toBeNull()
  })

  it('starts again at the first page when a filter changes', () => {
    const bots = [...many(60), mkBot({ name: 'H1 Seul', timeframe: 'H1', stats: stats(30, 900) })]
    render(<FleetRegister bots={bots} initialState={EMPTY_FILTERS} />)
    fireEvent.click(screen.getByRole('button', { name: 'Voir les 11 suivants' }))
    expect(rowsOf(screen.getByTestId('fleet-table'))).toHaveLength(61)
    fireEvent.change(screen.getByRole('combobox', { name: /Horizon/ }), { target: { value: 'H4' } })
    expect(rowsOf(screen.getByTestId('fleet-table'))).toHaveLength(50)
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

  it('names the responsible filter when a selection returns nothing, with ONE way out (audit n° 75)', () => {
    render(<FleetRegister bots={REGISTER_FIXTURE} initialState={{ ...EMPTY_FILTERS, family: ['carry'], timeframe: ['M15'] }} />)
    expect(screen.getByTestId('fleet-empty')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /Retirer les filtres|Tout effacer/ })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Retirer les filtres' }))
    expect(screen.queryByTestId('fleet-empty')).toBeNull()
  })

  it('disables an option at « (0) » (audit n° 75)', () => {
    const bots = [
      mkBot({ name: 'H4 Un', timeframe: 'H4', family: 'trend', stats: stats(30) }),
      mkBot({ name: 'H1 Un', timeframe: 'H1', family: 'breakout', stats: stats(40) }),
    ]
    render(<FleetRegister bots={bots} initialState={{ ...EMPTY_FILTERS, timeframe: ['H4'] }} />)
    const family = [...select(/Famille/).options]
    const breakout = family.find(o => o.value === 'breakout')!
    expect(breakout.textContent).toMatch(/\(0\)$/)
    expect(breakout.disabled).toBe(true)
    expect(family.find(o => o.value === 'trend')!.disabled).toBe(false)
    expect(family.find(o => o.value === 'carry')!.disabled).toBe(true)
    // No bot here has a trade: both sides are at zero.
    expect([...select(/Sens/).options].filter(o => o.disabled).map(o => o.value)).toEqual(['long', 'short'])
  })

  it('keeps the option in force enabled even at zero, so the list says what filters', () => {
    render(<FleetRegister bots={[mkBot({ name: 'H4 Un', family: 'trend' })]} initialState={{ ...EMPTY_FILTERS, family: ['carry'] }} />)
    const carry = [...select(/Famille/).options].find(o => o.value === 'carry')!
    expect(carry.textContent).toBe('Portage (0)')
    expect(carry.disabled).toBe(false)
    expect(select(/Famille/).value).toBe('carry')
  })

  it('lists a horizon no bot has when the URL carries it, instead of showing « Tous »', () => {
    render(<FleetRegister bots={[mkBot({ name: 'H4 Un', timeframe: 'H4' })]} initialState={{ ...EMPTY_FILTERS, timeframe: ['M1'] }} />)
    expect(select(/Horizon/).value).toBe('M1')
    expect([...select(/Horizon/).options].find(o => o.value === 'M1')!.textContent).toBe('M1 (0)')
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

  it('sorts by profit factor in the same single list, the untraded last', () => {
    const bots = [
      mkBot({ name: 'Solide', stats: pf(100, 1.2) }),
      mkBot({ name: 'Chanceux', stats: pf(3, 9) }),
      mkBot({ name: 'Fort', stats: pf(40, 1.8) }),
      mkBot({ name: 'Jamais', stats: pf(0, 0) }),
    ]
    render(<FleetRegister bots={bots} initialState={EMPTY_FILTERS} />)
    fireEvent.change(select(/Trier/), { target: { value: 'profit_factor' } })
    // « Chanceux » leads on 3 trades: its row says « rodage », the order no longer hides it.
    expect(rowsOf(screen.getByTestId('fleet-table'))).toEqual(['Chanceux', 'Fort', 'Solide', 'Jamais'])
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
  it('shows PF and the result on the row, not just the trade count', () => {
    const bot = prodBot('macdvolume-bf11', {
      name: 'MACD Volume H4 BF',
      stats: { total_trades: 31, win_rate: 0.548, profit_factor: 1.42, max_drawdown: 0.072, latest_capital: 1000.62 },
    })
    render(<FleetRegister bots={[bot]} initialState={EMPTY_FILTERS} />)
    const table = screen.getByTestId('fleet-table')
    expect(table.textContent).toMatch(/1,42/)
    expect(table.textContent).toMatch(/0,62/)
  })

  it('writes « 1 trade », not « 1 trades »', () => {
    render(<FleetRegister bots={[mkBot({ name: 'Un', stats: stats(1, 1010) })]} initialState={EMPTY_FILTERS} />)
    const row = rowOf(screen.getByTestId('fleet-table'), 'Un')
    expect(row.textContent).toMatch(/1 trade(?!s)/)
  })
})
