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
  // Owner, 03/10: « en entonnoir, du plus grand chiffre au plus petit ». Three nested sets
  // (candidates within judged within swept), so the funnel is true; configurations only.
  it('runs the funnel from the largest figure to the smallest: swept, judged, candidates', () => {
    render(<EngineLedger counts={COUNTS} />)
    const steps = screen.getAllByTestId('engine-step')
    expect(steps.map(s => s.getAttribute('data-step'))).toEqual(['swept', 'judged', 'go'])
    const figures = steps.map(s => Number(s.querySelector('.tabular-nums')!.textContent!.replace(/\D/g, '')))
    expect(figures).toEqual([51_339_525, 2_144_077, 4_347])
    expect(figures[0] > figures[1] && figures[1] > figures[2]).toBe(true)
    expect(screen.getByTestId('engine-funnel').tagName).toBe('OL')
  })

  // The rejected and the suspended are the judged that did not get through, beside the judged
  // step, never a step of their own; the three verdicts still sum to the judged.
  it('sets the rejected and the suspended beside the judged step, and they sum with the candidates', () => {
    render(<EngineLedger counts={COUNTS} />)
    const judged = screen.getAllByTestId('engine-step')[1]
    const dropped = within(judged).getByTestId('engine-dropped').textContent!.replace(/\s/g, ' ')
    expect(dropped).toMatch(/1 775 174 recalées/)
    expect(dropped).toMatch(/364 556 en sursis/)
    expect(COUNTS.n_no_go + COUNTS.n_marginal + COUNTS.n_go).toBe(COUNTS.n_judged)
  })

  // « recensées », never « testées » (funnel.ts) nor « recalé » (D059); the unjudged rest is
  // not counted, it grows with every sweep (owner, 03/10).
  it('names the swept corpus plainly, never tested or rejected, without counting the rest', () => {
    render(<EngineLedger counts={COUNTS} />)
    const swept = screen.getAllByTestId('engine-step')[0].textContent!.replace(/\s/g, ' ')
    expect(swept).toMatch(/configurations recensées/)
    expect(swept).toMatch(/Toutes les combinaisons de réglages que mon moteur a passées en revue\. Seule une partie va jusqu’aux quatre épreuves\./)
    expect(swept).not.toMatch(/testées|recal|49 195 448/)
    expect(screen.getByTestId('engine-outside').textContent).toMatch(/Mes bots et les variantes de la bibliothèque se comptent à part/)
  })

  it('draws the arrows between steps, hidden from assistive tech, and types none', () => {
    render(<EngineLedger counts={COUNTS} />)
    const downs = screen.getAllByTestId('engine-down')
    expect(downs).toHaveLength(2)
    for (const d of downs) {
      expect(d.tagName.toLowerCase()).toBe('svg')
      expect(d.getAttribute('aria-hidden')).toBe('true')
    }
    expect(screen.getByTestId('engine-funnel').textContent).not.toMatch(/[→↓▼]/)
  })

  it('puts the conclusion under the figures, the ratio said in words, no display-size number', () => {
    render(<EngineLedger counts={COUNTS} />)
    const head = screen.getByTestId('engine-head')
    expect(within(head).getByRole('heading', { level: 2 }).textContent).toBe('Mon moteur retient environ 1 configuration sur 500')
    expect(within(head).getByRole('link', { name: /Comment je décide/ })).toBeTruthy()
    expect(head.compareDocumentPosition(screen.getByTestId('engine-funnel')) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
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
