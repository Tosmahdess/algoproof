// The home's engine addition and the fleet's origin line (owner, 03/10/2026: « on perd
// l'info du nombre de configurations testées, de celles qui ont eu un go, notre
// nombre de bots »). Proposal Impeccable, docs/home-chiffres/impeccable/.
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import EngineLedger from '@/components/home/EngineLedger'
import RealMoneyRegister from '@/components/home/RealMoneyRegister'
import type { FunnelCounts } from '@/lib/funnel'
import { mkBot } from '../fixtures/bots'

const COUNTS: FunnelCounts = {
  n_swept: 51_339_525, n_judged: 2_144_077, n_go: 4_347, n_marginal: 364_556, n_no_go: 1_775_174,
  n_promoted: 215, n_live: 3,
}

describe('EngineLedger', () => {
  it('writes the three verdicts, then their sum closed by a double rule', () => {
    render(<EngineLedger counts={COUNTS} />)
    const rows = screen.getAllByTestId('engine-row').map(r => r.textContent!.replace(/\s/g, ''))
    expect(rows.map(r => r.match(/^\D+/)![0])).toEqual(['Recalées', 'Ensursis', 'Candidates'])
    const total = screen.getByTestId('engine-total')
    expect(total.textContent!.replace(/\s/g, '')).toBe('Configurationsjugées2144077')
    expect(total.className).toMatch(/border-double/)
    expect(COUNTS.n_no_go + COUNTS.n_marginal + COUNTS.n_go).toBe(COUNTS.n_judged)
  })

  it('says the ratio in the heading, in words, with no big number', () => {
    render(<EngineLedger counts={COUNTS} />)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Mon moteur retient environ 1 configuration sur 500')
    expect(document.body.innerHTML).not.toMatch(/text-\[(3\d|4\d)px\]|text-[34]xl/)
  })

  it('keeps the swept corpus out of the sum and never calls it rejected', () => {
    render(<EngineLedger counts={COUNTS} />)
    expect(within(screen.getByTestId('engine-ledger')).queryByText(/recens/)).toBeNull()
    const outside = screen.getByTestId('engine-outside').textContent!.replace(/\s/g, ' ')
    expect(outside).toMatch(/recensé 51 339 525 configurations, et les 49 195 448 qu’il n’a pas jugées n’ont pas de verdict/)
    expect(outside).toMatch(/Je ne les compte pas comme recalées/)
  })

  it('renders nothing without a judged denominator, and no ratio without a candidate', () => {
    const { container, rerender } = render(<EngineLedger counts={null} />)
    expect(container.innerHTML).toBe('')
    rerender(<EngineLedger counts={{ ...COUNTS, n_judged: 0 }} />)
    expect(container.innerHTML).toBe('')
    rerender(<EngineLedger counts={{ ...COUNTS, n_go: 0, n_judged: COUNTS.n_judged - COUNTS.n_go }} />)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Mon moteur n’a retenu aucune configuration')
  })
})

describe('RealMoneyRegister, the fleet by origin', () => {
  const live = [mkBot({ slug: 'v1-spot', status: 'live', stats: { total_trades: 42, win_rate: 0.595, profit_factor: 2.82, max_drawdown: 0.022, latest_capital: 1272.73 } })]

  it('splits the same total in two parts that sum to it', () => {
    render(<RealMoneyRegister bots={live} fleetSize={215} engineBorn={195} reading={null} />)
    expect(screen.getByTestId('home-fleet-origin').textContent!.replace(/\s/g, ' '))
      .toBe('Sur ces 215 bots, 195 sont issus de mon moteur et 20 ont été déployés à la main avant lui.')
  })

  it('writes no split when one part is empty or unknown', () => {
    const { rerender } = render(<RealMoneyRegister bots={live} fleetSize={215} reading={null} />)
    expect(screen.queryByTestId('home-fleet-origin')).toBeNull()
    rerender(<RealMoneyRegister bots={live} fleetSize={215} engineBorn={0} reading={null} />)
    expect(screen.queryByTestId('home-fleet-origin')).toBeNull()
  })
})
