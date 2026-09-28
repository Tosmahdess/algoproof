// tests/components/BacktestSegmentLegend.test.tsx
//
// 2026-09-25 pilot: the backtest drawn before the paper launch must say what it is, on the
// chart itself: selection data, not a result, and outside every figure of the page.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import BacktestSegmentLegend from '@/components/BacktestSegmentLegend'

const text = () =>
  render(<BacktestSegmentLegend freezeDate="2026-08-01" simStart="2026-08-02" />).container.textContent?.replace(/\s+/g, ' ') ?? ''

describe('BacktestSegmentLegend', () => {
  it('names both segments, the freeze and the first simulated day', () => {
    const t = text()
    expect(t).toContain('backtest')
    expect(t).toContain('1er août 2026')
    expect(t).toContain('simulation à partir du 2 août 2026')
    expect(t).not.toMatch(/lancement/)
  })

  it('says the backtest was seen during selection and stays out of the figures', () => {
    const t = text()
    expect(t).toMatch(/sélectionné cette stratégie/)
    expect(t).toMatch(/jamais vus/)
    expect(t).toMatch(/ne comptent que ce trait plein/)
    expect(t).toContain('1 000 € le 1er janvier')
    expect(t).toContain('dimensionnées sur le capital atteint')
  })

  it('carries no em dash (site-wide ban)', () => {
    expect(text()).not.toMatch(/—/)
  })
})
