import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import FleetRegister from '@/components/FleetRegister'
import { EMPTY_FILTERS } from '@/lib/bot-filters'
import { SORT_LABELS } from '@/lib/fleet-sort'
import { FIXTURE_FLEET, mkBot, prodBot } from '../fixtures/bots'

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

// FleetRegister now only ever receives the register set — paper + archived,
// with `live` already excluded by FleetOverview before this component sees
// a single prop (see FleetOverview.tsx and FleetRegister's own file header).
// Filtering here mirrors that real contract, so these tests exercise the
// component the way it is actually used rather than a scenario (a `live` bot
// reaching the register) that can no longer happen.
const REGISTER_FIXTURE = FIXTURE_FLEET.filter(b => b.status !== 'live')

describe('FleetRegister', () => {
  // FIX (layout, real-money cards hoisted): the `fleet-real` section used to
  // render inside this component, fed by its own `splitCohorts` call. It is
  // gone from FleetRegister's JSX entirely now — moved to FleetOverview,
  // which sits above FleetBalance instead. Passing the FULL fixture (still
  // containing `live`-status bots) here is deliberate: it proves the absence
  // is structural — this component has no code path left that could render a
  // `fleet-real` section, even if it were handed a `live` bot by mistake.
  // The equivalent positive assertion (fleet-real IS present, as a sibling of
  // fleet-balance) lives in FleetOverview.test.tsx, where that section now is.
  it('never renders a real-money section — that moved to FleetOverview', () => {
    render(<FleetRegister bots={FIXTURE_FLEET} initialState={EMPTY_FILTERS} />)
    expect(screen.queryByTestId('fleet-real')).toBeNull()
  })

  it('lists a deployed bot that has never traded', () => {
    render(<FleetRegister bots={REGISTER_FIXTURE} initialState={EMPTY_FILTERS} />)
    expect(screen.getAllByText(/Ichimoku/).length).toBeGreaterThan(0)
  })

  it('collapses archived bots but keeps them present', () => {
    render(<FleetRegister bots={REGISTER_FIXTURE} initialState={EMPTY_FILTERS} />)
    const archived = screen.getByTestId('fleet-archived')
    expect(archived.tagName.toLowerCase()).toBe('details')
    expect(archived.hasAttribute('open')).toBe(false)
    // The archived section is flat, not grouped, so the row prints the bot's own
    // production `strategy` sentence rather than a fiche title.
    expect(within(archived).getByText('Chandelier Exit H4 — 14 actifs')).toBeTruthy()
  })

  it('shows a count next to every family option', () => {
    render(<FleetRegister bots={REGISTER_FIXTURE} initialState={EMPTY_FILTERS} />)
    expect(screen.getByRole('button', { name: /Momentum \(1\)/ })).toBeTruthy()
  })

  it('names the responsible filter when a combination returns nothing', () => {
    render(<FleetRegister bots={REGISTER_FIXTURE} initialState={EMPTY_FILTERS} />)
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
    render(<FleetRegister bots={REGISTER_FIXTURE} initialState={EMPTY_FILTERS} />)
    // Unfiltered: both the trend-family dormant bot and the carry-family bot show.
    expect(screen.getAllByText(/Ichimoku/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Funding Rate Harvesting/).length).toBeGreaterThan(0)

    // `window.dispatchEvent` bypasses React Testing Library's `fireEvent`
    // act() wrapping (that only instruments DOM element events), so the
    // resulting setState would otherwise land outside a React act() batch
    // and this assertion could run before the re-render commits.
    act(() => {
      window.history.pushState(null, '', '/overview?family=carry')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    // After popstate re-parses ?family=carry, only the carry-family bot remains.
    expect(screen.getAllByText(/Funding Rate Harvesting/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Ichimoku/)).toBeNull()
  })
})

// FIX (final whole-branch review, I1): SORT_LABELS and FleetFilterState.sort
// existed, sortFleet applied them, and nothing on screen could set them. The
// register is grouped by strategy, so these two bots deliberately land in ONE
// group: two of the eight real EMA Cross incarnations, which carry two
// different `strategy` sentences in production and are joined by the fiche key
// rather than by that sentence. Group ORDER is decided by groupByStrategy
// (incarnation count, then label) and is not a function of the sort — the sort
// orders the rows.
describe('FleetRegister — the sort control', () => {
  const SORTABLE = [
    prodBot('v1-spot', {
      name: 'Seasoned Bot', status: 'paper',
      stats: { total_trades: 400, profit_factor: 1.1, win_rate: 0.5, max_drawdown: 0.1, latest_capital: 1100 },
    }),
    prodBot('v1-hl', {
      name: 'Lucky Bot', status: 'paper',
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

// /overview and /strategies/<concept> described the same bots with no link in
// either direction. The header is now titled from the fiche, not from the bot's
// own deployment sentence — « EMA Cross », not « EMA Cross H4 (21/55/200) ».
describe('FleetRegister — the group header joins the register to the concept page', () => {
  it('links a group a fiche claims to that fiche', () => {
    render(
      <FleetRegister
        bots={[prodBot('v1-spot', { name: 'EMA Bot', status: 'paper' })]}
        initialState={EMPTY_FILTERS}
      />,
    )
    const header = screen.getByRole('link', { name: 'EMA Cross' })
    expect(header.getAttribute('href')).toBe('/strategies/ema-cross')
  })

  it('leaves the header as plain text when no fiche claims the group', () => {
    const grid = 'Grille arithmétique ±8% — BTC/USDT Binance Spot'
    render(
      <FleetRegister
        bots={[prodBot('grid-btc-spot', { name: 'Grid BTC Spot', status: 'paper' })]}
        initialState={EMPTY_FILTERS}
      />,
    )
    // The group is still headed, under the operator's own wording, and still
    // counted — it just is not a link.
    expect(screen.getByText(new RegExp(grid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeTruthy()
    expect(screen.queryByRole('link', { name: grid })).toBeNull()
  })
})
