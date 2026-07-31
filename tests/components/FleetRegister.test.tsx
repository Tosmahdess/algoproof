import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import FleetRegister from '@/components/FleetRegister'
import { EMPTY_FILTERS } from '@/lib/bot-filters'
import { FIXTURE_FLEET } from '../fixtures/bots'

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
