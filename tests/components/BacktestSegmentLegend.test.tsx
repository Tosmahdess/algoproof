// tests/components/BacktestSegmentLegend.test.tsx
//
// 2026-09-25 pilot: the backtest drawn before the paper launch must say what it is, on the
// chart itself: selection data, not a result, and outside every figure of the page.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import BacktestSegmentLegend from '@/components/BacktestSegmentLegend'

const text = () =>
  render(<BacktestSegmentLegend launchDate="2026-08-21" />).container.textContent?.replace(/\s+/g, ' ') ?? ''

describe('BacktestSegmentLegend', () => {
  it('names both segments and the launch day', () => {
    const t = text()
    expect(t).toContain('backtest')
    expect(t).toContain('21 août 2026')
    expect(t).toContain('simulation')
  })

  it('says the backtest was seen during selection and stays out of the figures', () => {
    const t = text()
    expect(t).toMatch(/déjà vu ces données pendant sa sélection/)
    expect(t).toMatch(/ne comptent que ce trait plein/)
    expect(t).toContain('1 000 € le 1er janvier')
  })

  it('carries no em dash (site-wide ban)', () => {
    expect(text()).not.toMatch(/—/)
  })
})
