import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import FleetRegister from '@/components/FleetRegister'
import { FIXTURE_FLEET } from '../fixtures/bots'

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/overview',
}))

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => null }))
})

describe('FleetRegister', () => {
  it('pins real-money bots to their own stage, outside the filterable register', () => {
    render(<FleetRegister bots={FIXTURE_FLEET} />)
    const real = screen.getByTestId('fleet-real')
    expect(within(real).getByText('EMA Cross H4 Kraken')).toBeTruthy()
    expect(within(real).getByText('ORB H1 HL')).toBeTruthy()
  })

  it('lists a deployed bot that has never traded', () => {
    render(<FleetRegister bots={FIXTURE_FLEET} />)
    expect(screen.getAllByText(/Ichimoku/).length).toBeGreaterThan(0)
  })

  it('collapses archived bots but keeps them present', () => {
    render(<FleetRegister bots={FIXTURE_FLEET} />)
    const archived = screen.getByTestId('fleet-archived')
    expect(archived.tagName.toLowerCase()).toBe('details')
    expect(archived.hasAttribute('open')).toBe(false)
    expect(within(archived).getByText(/TSMOM/)).toBeTruthy()
  })

  it('shows a count next to every family option', () => {
    render(<FleetRegister bots={FIXTURE_FLEET} />)
    expect(screen.getByRole('button', { name: /Momentum \(1\)/ })).toBeTruthy()
  })

  it('names the responsible filter when a combination returns nothing', () => {
    render(<FleetRegister bots={FIXTURE_FLEET} />)
    fireEvent.click(screen.getByRole('button', { name: /Portage/ }))
    fireEvent.click(screen.getByRole('button', { name: /Kraken/ }))
    expect(screen.getByTestId('fleet-empty').textContent).toMatch(/Kraken|Portage/)
  })
})
