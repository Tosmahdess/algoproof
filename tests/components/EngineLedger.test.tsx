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
  // Owner, 03/10: « les 5 chiffres sur la même ligne et une toute petite phrase pour chacun ».
  // In this order they also run from the largest to the smallest.
  it('sets the five figures on one row, largest to smallest, each with a short phrase', () => {
    render(<EngineLedger counts={COUNTS} />)
    const cells = screen.getAllByTestId('engine-figure')
    expect(cells.map(c => c.getAttribute('data-kind'))).toEqual(['swept', 'judged', 'no_go', 'marginal', 'go'])
    const values = cells.map(c => Number(c.querySelector('.tabular-nums')!.textContent!.replace(/\D/g, '')))
    expect(values).toEqual([51_339_525, 2_144_077, 1_775_174, 364_556, 4_347])
    for (let i = 1; i < values.length; i++) expect(values[i - 1] > values[i]).toBe(true)
    for (const c of cells) {
      const phrase = c.querySelector('[data-testid="engine-phrase"]')!.textContent!.trim()
      expect(phrase.split(/\s+/).length).toBeLessThanOrEqual(5)
    }
    expect(screen.getByTestId('engine-row-figures').className).toMatch(/lg:grid-cols-5/)
  })

  it('keeps the verdicts true: they sum to the judged, and the swept is never called tested or rejected', () => {
    render(<EngineLedger counts={COUNTS} />)
    expect(COUNTS.n_no_go + COUNTS.n_marginal + COUNTS.n_go).toBe(COUNTS.n_judged)
    const swept = screen.getAllByTestId('engine-figure')[0].textContent!.replace(/\s/g, ' ')
    expect(swept).toMatch(/recensées/)
    expect(swept).not.toMatch(/testées|recal/)
    expect(screen.getByTestId('engine-outside').textContent).toMatch(/Mes bots et les variantes de la bibliothèque se comptent à part/)
  })

  it('puts the conclusion under the figures, the ratio said in words, no display-size number', () => {
    render(<EngineLedger counts={COUNTS} />)
    const head = screen.getByTestId('engine-head')
    expect(within(head).getByRole('heading', { level: 2 }).textContent).toBe('Mon moteur retient environ 1 configuration sur 500')
    expect(within(head).getByRole('link', { name: /Comment je décide/ })).toBeTruthy()
    expect(head.compareDocumentPosition(screen.getByTestId('engine-row-figures')) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
    expect(document.body.innerHTML).not.toMatch(/text-\[(3\d|4\d)px\]|text-[34]xl/)
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
