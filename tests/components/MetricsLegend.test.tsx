import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MetricsLegend from '@/components/MetricsLegend'

// Counter-audit 2026-09-26 (F-M4): the three sigles are explained where they are
// first printed, each one a link to its lexicon entry.
describe('MetricsLegend', () => {
  it('links PF, WR and DD to their lexicon entries', () => {
    render(<MetricsLegend />)
    const hrefs = screen.getAllByRole('link').map(a => a.getAttribute('href'))
    expect(hrefs).toEqual(expect.arrayContaining(['/lexique#profit-factor', '/lexique#win-rate', '/lexique#drawdown', '/lexique']))
    expect(screen.getByTestId('metrics-legend').textContent).toMatch(/au-dessus de 1 la stratégie gagne/)
  })
})
