import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SimVsBacktest from '@/components/library/SimVsBacktest'

// Lot 2c, « Backtest contre simulation » on the idea page (Fable 04/10: not « Tient ses
// promesses ? », which is itself the implicit promise). Two figures side by side in the
// same unit, never a pass/fail verdict, and the selection backtest called flattering by
// construction: a gap downwards is expected.
const sc = (days: number, mean: number | null, prudent: number | null) =>
  ({ days, trades: days + 4, mean, prudent, ranked: prudent !== null })

describe('SimVsBacktest', () => {
  it('says nothing when no variant was launched', () => {
    const { container } = render(<SimVsBacktest launched={0} score={null} backtestMean={null} />)
    expect(container.textContent).toBe('')
  })

  it('says the comparison waits for 30 entry days, and how many there are', () => {
    render(<SimVsBacktest launched={4} score={sc(11, 1.2, null)} backtestMean={null} />)
    const block = screen.getByTestId('sim-vs-backtest')
    expect(block.textContent).toMatch(/Backtest contre simulation/)
    expect(block.textContent).toMatch(/11 journées de trading en simulation \(15 trades\)/)
    expect(block.textContent).toMatch(/j’en attends 30/i)
    expect(block.textContent).not.toMatch(/1,2/)                  // no raw mean before ranking
  })

  it('says when no launched variant has closed a trade yet', () => {
    render(<SimVsBacktest launched={2} score={null} backtestMean={null} />)
    expect(screen.getByTestId('sim-vs-backtest').textContent).toMatch(/aucune n’a encore fermé de trade en simulation/)
  })

  it('puts the two figures side by side once ranked, and places the simulation against the backtest', () => {
    render(<SimVsBacktest launched={6} score={sc(34, 1.5, 0.4)} backtestMean={6.8} />)
    const t = screen.getByTestId('sim-vs-backtest').textContent ?? ''
    expect(t).toMatch(/Backtest de sélection\s*\+6,8 € par trade/)
    expect(t).toMatch(/Simulation\s*\+1,5 € par trade/)
    expect(t).toMatch(/gain prudent \+0,4 €/)
    expect(t).toMatch(/en dessous du backtest/)
    expect(t).toMatch(/flatteur par construction/)
  })

  it('calls it level when the backtest sits inside the margin, and above when the prudent gain beats it', () => {
    const level = render(<SimVsBacktest launched={6} score={sc(34, 1.5, 0.4)} backtestMean={2.0} />)
    expect(level.container.textContent).toMatch(/au niveau du backtest, dans la marge d’erreur/)
    level.unmount()
    render(<SimVsBacktest launched={6} score={sc(34, 3, 2.5)} backtestMean={2.0} />)
    expect(screen.getByTestId('sim-vs-backtest').textContent).toMatch(/au-dessus du backtest/)
  })

  it('keeps the simulation figures when the backtest one is unavailable', () => {
    render(<SimVsBacktest launched={6} score={sc(34, 1.5, 0.4)} backtestMean={null} />)
    const t = screen.getByTestId('sim-vs-backtest').textContent ?? ''
    expect(t).toMatch(/gain prudent \+0,4 €/)
    expect(t).toMatch(/backtest de sélection n’est pas disponible/)
  })
})
