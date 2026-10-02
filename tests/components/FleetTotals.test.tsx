import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import FleetTotals, { baseLabel } from '@/components/FleetTotals'
import { computeFleetAggregate } from '@/lib/fleet-aggregate'
import { fmtEur } from '@/lib/display'

// Lot 4 of the design audit (2026-09-25, conception §5.2): the fleet opens on its
// two totals, each with its denominator (bots, trades), never fused (R1). The
// « 96 / 3 » tiles with icons and the market-weather banner that used to open
// the page are gone: the home already counts the fleet, /intelligence already
// shows the weather.
const AGG = computeFleetAggregate(
  [
    { bot_id: 'live-1', pnl: 40, closed_at: '2026-07-01T00:00:00Z', side: 'long', asset: 'BTC' },
    { bot_id: 'live-1', pnl: 12.5, closed_at: '2026-07-03T00:00:00Z', side: 'long', asset: 'BTC' },
    { bot_id: 'paper-1', pnl: -60, closed_at: '2026-07-02T00:00:00Z', side: 'short', asset: 'ETH' },
    { bot_id: 'paper-2', pnl: 1234.56, closed_at: '2026-07-02T00:00:00Z', side: 'short', asset: 'ETH' },
    { bot_id: 'paper-2', pnl: 0.44, closed_at: '2026-07-04T00:00:00Z', side: 'short', asset: 'ETH' },
  ],
  [{ id: 'live-1', live_since: '2026-01-01T00:00:00Z' }],
)

describe('FleetTotals', () => {
  it('shows the real-money total with its bots and trades', () => {
    render(<FleetTotals aggregate={AGG} liveCount={3} paperCount={93} />)
    const real = screen.getByTestId('fleet-total-real')
    expect(within(real).getByText('Argent réel')).toBeTruthy()
    expect(real.textContent).toContain(fmtEur(52.5))
    expect(real.textContent).toMatch(/3 bots/)
    expect(real.textContent).toMatch(/2 trades/)
  })

  it('shows the simulation total with its bots and trades, French thousands', () => {
    render(<FleetTotals aggregate={AGG} liveCount={3} paperCount={1234} />)
    const labo = screen.getByTestId('fleet-total-labo')
    expect(within(labo).getByText('Simulation')).toBeTruthy()
    expect(labo.textContent).toContain(fmtEur(1175))
    // Lot 5: thousands take U+00A0 (Inter renders U+202F under 2 px); compared on a plain space.
    expect(labo.textContent!.replace(/[\u202F\u00A0]/g, ' ')).toMatch(/1 234 bots/)
    expect(labo.textContent).toMatch(/3 trades/)
  })

  it('never prints the fused total, and says so', () => {
    const { container } = render(<FleetTotals aggregate={AGG} liveCount={3} paperCount={93} />)
    expect(container.textContent).not.toContain(fmtEur(52.5 + 1175))
    expect(container.textContent).not.toMatch(/5 trades/)
    expect(container.textContent).toMatch(/Je compte séparément l’argent réel et la simulation/)
  })

  // Refonte registre, lot 1: tabular figures in the text face, not mono; the
  // loss keeps its colour (and its sign).
  it('writes its figures in tabular figures, and the loss in red', () => {
    const lossAgg = computeFleetAggregate(
      [{ bot_id: 'live-1', pnl: -9.5, closed_at: '2026-07-01T00:00:00Z', side: 'long', asset: 'BTC' }],
      [{ id: 'live-1', live_since: '2026-01-01T00:00:00Z' }],
    )
    render(<FleetTotals aggregate={lossAgg} liveCount={1} paperCount={0} />)
    const real = screen.getByTestId('fleet-total-real')
    // getByText collapses the narrow no-break space of fmtEur to a plain space.
    const plain = (t: string) => t.replace(/\u202F/g, ' ')
    const figure = within(real).getByText(plain(fmtEur(-9.5)))
    expect(figure.className).toMatch(/tabular-nums/)
    expect(figure.className).not.toMatch(/font-mono/)
    expect(figure.className).toMatch(/text-negative/)
    const labo = screen.getByTestId('fleet-total-labo')
    expect(within(labo).getByText(plain(fmtEur(0))).className).not.toMatch(/text-negative/)
  })

  // Refonte finition (2026-10-02): each total names its base as a label, never a
  // sentence; the simulation's is the sum of its starting capitals. Row-sized, sober.
  it('names each base as a label: « sur 3 × 1 000 € », the simulation as a sum', () => {
    const plain = (t: string | null | undefined) => (t ?? '').replace(/[\u202F\u00A0]/g, ' ')
    expect(plain(baseLabel([1000, 1000, 1000]))).toBe('sur 3 × 1 000 €')
    expect(plain(baseLabel([1000, 500]))).toBe('sur 1 500 €')
    expect(plain(baseLabel([1000, 1000], { sumOnly: true }))).toBe('sur 2 000 €')
    expect(baseLabel([])).toBeNull()
    render(<FleetTotals aggregate={AGG} liveCount={3} paperCount={2}
      bases={{ real: [1000, 1000, 1000], labo: [1000, 2000] }} />)
    expect(plain(screen.getByTestId('fleet-total-real-base').textContent)).toBe('sur 3 × 1 000 €')
    expect(plain(screen.getByTestId('fleet-total-labo-base').textContent)).toBe('sur 3 000 €')
  })

  it('writes the totals at a row result’s size, a gain in ink, never in green', () => {
    render(<FleetTotals aggregate={AGG} liveCount={3} paperCount={93} />)
    const figure = screen.getByTestId('fleet-total-labo').querySelector('.tabular-nums')!
    expect(figure.textContent).toBe(fmtEur(1175))
    expect(figure.className).toMatch(/text-lg md:text-xl/)
    expect(figure.className).not.toMatch(/text-4xl|text-positive/)
  })
})
