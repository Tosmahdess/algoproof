import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import FleetRegister from '@/components/FleetRegister'
import { EMPTY_FILTERS } from '@/lib/bot-filters'
import { SORT_LABELS } from '@/lib/fleet-sort'
import { FIXTURE_FLEET, mkBot } from '../fixtures/bots'

// FIX round 2: no more useSearchParams() in FleetRegister at all (it now
// receives `initialState` as a prop instead), so this mock only needs
// usePathname — kept because `push()` still reads it to build the URL for
// window.history.replaceState.
vi.mock('next/navigation', () => ({
  usePathname: () => '/overview',
}))

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => null }))
})

describe('FleetRegister', () => {
  it('pins real-money bots to their own stage, outside the filterable register', () => {
    render(<FleetRegister bots={FIXTURE_FLEET} initialState={EMPTY_FILTERS} />)
    const real = screen.getByTestId('fleet-real')
    expect(within(real).getByText('EMA Cross H4 Kraken')).toBeTruthy()
    expect(within(real).getByText('ORB H1 HL')).toBeTruthy()
  })

  it('lists a deployed bot that has never traded', () => {
    render(<FleetRegister bots={FIXTURE_FLEET} initialState={EMPTY_FILTERS} />)
    expect(screen.getAllByText(/Ichimoku/).length).toBeGreaterThan(0)
  })

  it('collapses archived bots but keeps them present', () => {
    render(<FleetRegister bots={FIXTURE_FLEET} initialState={EMPTY_FILTERS} />)
    const archived = screen.getByTestId('fleet-archived')
    expect(archived.tagName.toLowerCase()).toBe('details')
    expect(archived.hasAttribute('open')).toBe(false)
    expect(within(archived).getByText(/TSMOM/)).toBeTruthy()
  })

  it('shows a count next to every family option', () => {
    render(<FleetRegister bots={FIXTURE_FLEET} initialState={EMPTY_FILTERS} />)
    expect(screen.getByRole('button', { name: /Momentum \(1\)/ })).toBeTruthy()
  })

  it('names the responsible filter when a combination returns nothing', () => {
    render(<FleetRegister bots={FIXTURE_FLEET} initialState={EMPTY_FILTERS} />)
    fireEvent.click(screen.getByRole('button', { name: /Portage/ }))
    fireEvent.click(screen.getByRole('button', { name: /Kraken/ }))
    expect(screen.getByTestId('fleet-empty').textContent).toMatch(/Kraken|Portage/)
  })

  // Fix round 2, ruling point 6: no more searchParams-sync effect, so
  // back/forward navigation is covered by a `popstate` listener instead.
  // Verify it by mutating the URL directly (the way real back/forward
  // navigation does) and dispatching `popstate` ourselves, then checking the
  // register re-filters to match.
  it('re-parses filter state from the URL on popstate (back/forward navigation)', () => {
    render(<FleetRegister bots={FIXTURE_FLEET} initialState={EMPTY_FILTERS} />)
    // Unfiltered: both the trend-family dormant bot and the carry-family bot show.
    expect(screen.getAllByText(/Ichimoku/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Funding Harvest/).length).toBeGreaterThan(0)

    // `window.dispatchEvent` bypasses React Testing Library's `fireEvent`
    // act() wrapping (that only instruments DOM element events), so the
    // resulting setState would otherwise land outside a React act() batch
    // and this assertion could run before the re-render commits.
    act(() => {
      window.history.pushState(null, '', '/overview?family=carry')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    // After popstate re-parses ?family=carry, only the carry-family bot remains.
    expect(screen.getAllByText(/Funding Harvest/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Ichimoku/)).toBeNull()
  })
})

// FIX (final whole-branch review, I1): SORT_LABELS and FleetFilterState.sort
// existed, sortFleet applied them, and nothing on screen could set them. The
// register is grouped by strategy, so these bots deliberately share one
// `strategy` string: that is the production shape (fleet-grouping.ts exists
// because « 14 strategies, 240 incarnations »), and it is where a sort is
// visible. Group ORDER is decided by groupByStrategy (incarnation count, then
// label) and is not a function of the sort — the sort orders the rows.
describe('FleetRegister — the sort control', () => {
  const SORTABLE = [
    mkBot({
      slug: 'seasoned', name: 'Seasoned Bot', strategy: 'EMA Cross', status: 'paper',
      stats: { total_trades: 400, profit_factor: 1.1, win_rate: 0.5, max_drawdown: 0.1, latest_capital: 1100 },
    }),
    mkBot({
      slug: 'lucky', name: 'Lucky Bot', strategy: 'EMA Cross', status: 'paper',
      stats: { total_trades: 3, profit_factor: 9, win_rate: 1, max_drawdown: 0, latest_capital: 3000 },
    }),
  ]

  // Scoped to list items on purpose: since I8 the group HEADER is a link too,
  // so a bare getAllByRole('link') would fold the strategy name into the row
  // order and this test would read as passing for the wrong reason.
  const rowOrder = () =>
    within(screen.getByTestId('fleet-register'))
      .getAllByRole('listitem')
      .map(li => within(li).getAllByRole('link')[0]?.textContent)

  it('defaults to the most-proven-first sort, and says so in the control', () => {
    render(<FleetRegister bots={SORTABLE} initialState={EMPTY_FILTERS} />)
    const select = screen.getByLabelText('Trier par') as HTMLSelectElement
    expect(select.value).toBe('proven')
    expect(rowOrder()).toEqual(['Seasoned Bot', 'Lucky Bot'])
  })

  it('offers every sort key, labelled from SORT_LABELS', () => {
    render(<FleetRegister bots={SORTABLE} initialState={EMPTY_FILTERS} />)
    for (const label of Object.values(SORT_LABELS)) {
      expect(screen.getByRole('option', { name: label })).toBeTruthy()
    }
  })

  it('reorders the register when a performance sort is picked', () => {
    render(<FleetRegister bots={SORTABLE} initialState={EMPTY_FILTERS} />)
    fireEvent.change(screen.getByLabelText('Trier par'), { target: { value: 'profit_factor' } })
    expect(rowOrder()).toEqual(['Lucky Bot', 'Seasoned Bot'])
  })

  it('flips the order with the direction toggle', () => {
    render(<FleetRegister bots={SORTABLE} initialState={EMPTY_FILTERS} />)
    fireEvent.change(screen.getByLabelText('Trier par'), { target: { value: 'profit_factor' } })
    fireEvent.click(screen.getByRole('button', { name: /Décroissant|Croissant/ }))
    expect(rowOrder()).toEqual(['Seasoned Bot', 'Lucky Bot'])
  })

  // This is what makes offering the sort defensible: the 3-trade bot that a
  // profit-factor ranking hoists to the top says on its own row that its
  // sample is too small to conclude from.
  it('keeps the low-sample note on a bot a performance sort promotes to the top', () => {
    render(<FleetRegister bots={SORTABLE} initialState={EMPTY_FILTERS} />)
    fireEvent.change(screen.getByLabelText('Trier par'), { target: { value: 'profit_factor' } })
    expect(rowOrder()[0]).toBe('Lucky Bot')
    expect(screen.getByText('trop tôt pour conclure')).toBeTruthy()
  })
})

// FIX (final whole-branch review, I8): /overview and /strategies/<concept>
// described the same bots with no link in either direction, under a
// fleet-grouping.ts comment still promising plan 3 would join them.
describe('FleetRegister — the group header joins the register to the concept page', () => {
  it('links a strategy a fiche claims to that fiche', () => {
    render(
      <FleetRegister
        bots={[mkBot({ name: 'EMA Bot', strategy: 'EMA Cross H4', status: 'paper' })]}
        initialState={EMPTY_FILTERS}
      />,
    )
    const header = screen.getByRole('link', { name: 'EMA Cross H4' })
    expect(header.getAttribute('href')).toBe('/strategies/ema-cross')
  })

  it('leaves the header as plain text when no fiche claims the strategy', () => {
    render(
      <FleetRegister
        bots={[mkBot({ name: 'Mystery Bot', strategy: 'Wavelet Cross', status: 'paper' })]}
        initialState={EMPTY_FILTERS}
      />,
    )
    // The group is still headed and still counted — it just is not a link.
    expect(screen.getByText(/Wavelet Cross/)).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Wavelet Cross' })).toBeNull()
  })
})
