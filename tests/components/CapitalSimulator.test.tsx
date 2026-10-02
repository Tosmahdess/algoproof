import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CapitalSimulator from '@/components/CapitalSimulator'
import type { PerfDaily } from '@/lib/types'

const pd = (date: string, capital: number, pnl_day: number): PerfDaily => ({
  id: date, bot_id: 'b', date, capital, pnl_day, win_rate: null, profit_factor: null,
})

const perf = [
  pd('2026-01-10', 1050, 50),
  pd('2026-02-10', 990, -60),
  pd('2026-03-10', 1040, 50),
]

describe('CapitalSimulator', () => {
  // Refonte finition (2026-10-02): the preset is 1 000 €, the base kept for real money
  // (was 500 €), so the page shows one result.
  it('renders scaled results at the default 1 000 € preset', () => {
    render(<CapitalSimulator perfDaily={perf} startCapital={1000} />)
    // +40 on 1000, read at 1000
    expect(screen.getByText(/\+40,00 €/)).toBeInTheDocument()
    // worst month −60 ; max drawdown (peak 1050 → 990) −60 too
    expect(screen.getAllByText(/−60,00 €/)).toHaveLength(2)
  })

  it('rescales when another preset is clicked', () => {
    render(<CapitalSimulator perfDaily={perf} startCapital={1000} />)
    fireEvent.click(screen.getByText('2500 €'))
    expect(screen.getByText(/\+100,00 €/)).toBeInTheDocument()
  })

  it('carries the non-projection disclaimer', () => {
    render(<CapitalSimulator perfDaily={perf} startCapital={1000} />)
    expect(screen.getByText(/pas une\s*projection/)).toBeInTheDocument()
    expect(screen.getByText(/conseil en investissement/)).toBeInTheDocument()
  })

  it('writes the period in French dates read from the data', () => {
    render(<CapitalSimulator perfDaily={perf} startCapital={1000} />)
    expect(screen.getByText(/du 10 janvier au 10 mars 2026/)).toBeInTheDocument()
    expect(screen.queryByText(/2026-01-10/)).toBeNull()
  })

  // Refonte lot 3 (2026-10-02, audit 2026-10 constat 4): the simulation alone leads, in
  // colour; the result since 1 January and the backtest's share are a grey line apart.
  it('leads with the simulation alone, the backtest apart and grey', () => {
    // backtest 1000 -> 1050 by 31 January, then the simulation gains 10 more
    const curve = [pd('2026-01-01', 1000, 0), pd('2026-01-31', 1050, 50), pd('2026-02-15', 1060, 10)]
    const { container } = render(<CapitalSimulator perfDaily={curve} startCapital={1000}
      backtestUntil="2026-01-31" backtestEndCapital={1050} />)
    const t = container.textContent!.replace(/\s+/g, ' ')
    expect(t).toContain('du 1er janvier au 15 février 2026')
    expect(t).toMatch(/déjà vues/)
    // 1 000 € preset: the simulation +10 on 1000, first and in ink
    const lead = screen.getByText(/Résultat de la simulation, depuis le 1er février 2026/)
    expect(lead.nextElementSibling!.textContent).toMatch(/^\+10,00\s€$/)
    // the whole curve +60, of which +50 is the backtest, in a muted line
    const apart = screen.getByTestId('capital-backtest')
    expect(apart.textContent).toMatch(/Depuis le 1er janvier, backtest compris : \+60,00\s€, dont \+50,00\s€ de backtest/)
    expect(apart.className).toContain('text-muted')
  })

  it('reads the worst month and trough of the simulation alone', () => {
    // the backtest lost 60 in January; the simulation never lost
    const curve = [pd('2026-01-01', 1000, 0), pd('2026-01-20', 940, -60), pd('2026-01-31', 1050, 110), pd('2026-02-15', 1060, 10)]
    render(<CapitalSimulator perfDaily={curve} startCapital={1000} backtestUntil="2026-01-31" backtestEndCapital={1050} />)
    expect(screen.getByText('aucun mois négatif')).toBeInTheDocument()
  })

  it('presses the chosen amount for assistive technology', () => {
    render(<CapitalSimulator perfDaily={perf} startCapital={1000} />)
    expect(screen.getByRole('button', { name: '1000 €' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: '500 €' }))
    expect(screen.getByRole('button', { name: '500 €' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: '1000 €' }).getAttribute('aria-pressed')).toBe('false')
  })

  // Refonte finition (2026-10-02): a bot without a trade has a flat curve; « +0,00 € »,
  // « aucun mois négatif » and « Pire creux +0,00 € » read as results it never had.
  it('without a trade: « — » in the three figures, no zero dressed as a result', () => {
    const flatCurve = [pd('2026-09-01', 1000, 0), pd('2026-09-20', 1000, 0)]
    const { container } = render(<CapitalSimulator perfDaily={flatCurve} startCapital={1000} traded={false} />)
    const dds = [...container.querySelectorAll('dd')]
    expect(dds.map(d => d.textContent)).toEqual(['—', '—', '—'])
    expect(container.textContent).not.toMatch(/\+0,00|aucun mois négatif/)
    expect(container.innerHTML).not.toMatch(/text-negative/)
  })

  it('renders nothing without history', () => {
    const { container } = render(<CapitalSimulator perfDaily={[]} startCapital={1000} />)
    expect(container).toBeEmptyDOMElement()
  })
})
