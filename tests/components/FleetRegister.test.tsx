import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import FleetRegister from '@/components/FleetRegister'
import { EMPTY_FILTERS } from '@/lib/bot-filters'
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

  it('names the responsible filter when a selection returns nothing', () => {
    // Only the family facet remains (the venue facet was removed 2026-08-08),
    // so the empty state is reached through a zero-count family pill — which
    // stays clickable by design (see FleetFilterBar's Pill).
    render(
      <FleetRegister
        bots={[prodBot('v1-spot', { name: 'Lone Trend Bot', status: 'paper' })]}
        initialState={EMPTY_FILTERS}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Portage/ }))
    expect(screen.getByTestId('fleet-empty').textContent).toMatch(/Portage/)
  })

  // 2026-08-08 (user call): the venue facet is gone — plumbing included, not
  // just the pills. bot-filters.ts's own history says why a control-less URL
  // facet must not survive: `direction` was deleted for exactly that.
  it('no longer offers the « Où ça tourne » facet', () => {
    render(<FleetRegister bots={REGISTER_FIXTURE} initialState={EMPTY_FILTERS} />)
    expect(screen.queryByText('Où ça tourne')).toBeNull()
    expect(screen.queryByRole('button', { name: /Kraken/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Hyperliquid/ })).toBeNull()
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

// FIX (per-timeframe rebuild, task 6): the sort control (SORT_LABELS,
// FleetFilterState.sort/dir wired through a <select> + direction toggle) is
// gone. It reordered rows WITHIN a strategy group; the register has no
// strategy groups left to reorder — groupByTimeframe fixes each table's row
// order to family-then-name, so a sort control here would change nothing on
// screen (see FleetFilterBar's own comment on why that would be dishonest).
describe('FleetRegister — no sort control', () => {
  it('does not offer a sort control', () => {
    render(<FleetRegister bots={[prodBot('v1-spot', { status: 'paper' })]} initialState={EMPTY_FILTERS} />)
    expect(screen.queryByLabelText('Trier par')).toBeNull()
    expect(screen.queryByText(/Décroissant|Croissant/)).toBeNull()
  })
})

// Rows are rendered by BotTable now (Task 5) — its own test file
// (src/components/__tests__/BotTable.test.tsx) covers the em-dash/low-sample
// masking rule at the row level. These two tests pin the FleetRegister-level
// contract on top of that: the register groups by TIMEFRAME, one <BotTable>
// per group, headed `{tf} — {n} stratégies`.
describe('FleetRegister — one table per timeframe', () => {
  const MIXED = [
    prodBot('v1-spot', { name: 'H4 Bot', status: 'paper', timeframe: 'H4' }),
    prodBot('orb-bf25', { name: 'H1 Bot', status: 'paper', timeframe: 'H1' }),
  ]

  it('renders one section per timeframe present, headed with the strategy count', () => {
    render(<FleetRegister bots={MIXED} initialState={EMPTY_FILTERS} />)
    expect(screen.getByTestId('fleet-tf-H4')).toBeTruthy()
    expect(screen.getByTestId('fleet-tf-H1')).toBeTruthy()
    expect(within(screen.getByTestId('fleet-tf-H4')).getByText('H4 — 1 stratégies')).toBeTruthy()
    expect(within(screen.getByTestId('fleet-tf-H1')).getByText('H1 — 1 stratégies')).toBeTruthy()
  })

  it('orders the H4 section before the H1 section (canonical TF order)', () => {
    const { container } = render(<FleetRegister bots={MIXED} initialState={EMPTY_FILTERS} />)
    const html = container.innerHTML
    expect(html.indexOf('data-testid="fleet-tf-H4"'))
      .toBeLessThan(html.indexOf('data-testid="fleet-tf-H1"'))
  })

  it('shows PF and P&L on the row via BotTable, not just the trade count', () => {
    const bot = prodBot('v1-spot', {
      name: 'Seasoned Bot', status: 'paper', start_capital: 1000, timeframe: 'H4',
      stats: { total_trades: 400, profit_factor: 1.42, win_rate: 0.5, max_drawdown: 0.1, latest_capital: 1100 },
    })
    render(<FleetRegister bots={[bot]} initialState={EMPTY_FILTERS} />)
    // BotTable always renders both the mobile list and the desktop table
    // (CSS-toggled, not conditional in jsdom) — the desktop <tr> is the one
    // that carries the PF column, so pick that instance specifically.
    const row = screen.getAllByText('Seasoned Bot')
      .map(el => el.closest('tr'))
      .find((el): el is HTMLTableRowElement => el !== null)!
    expect(within(row).getByText(/1\.42/)).toBeTruthy()
    expect(within(row).getByText(/\+100/)).toBeTruthy()
  })

  it('masks PF on a low-sample row — same honesty rule as everywhere else', () => {
    const bot = prodBot('v1-hl', {
      name: 'Fresh Bot', status: 'paper', start_capital: 1000, timeframe: 'H4',
      stats: { total_trades: 3, profit_factor: 9, win_rate: 1, max_drawdown: 0, latest_capital: 1010 },
    })
    render(<FleetRegister bots={[bot]} initialState={EMPTY_FILTERS} />)
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })
})
