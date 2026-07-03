import { describe, it, expect } from 'vitest'
import { isCarryFamily, fmtPfForFamily, fmtWinRateForFamily } from '@/lib/display'

describe('isCarryFamily', () => {
  it('returns true only for the carry family', () => {
    expect(isCarryFamily('carry')).toBe(true)
    expect(isCarryFamily('trend')).toBe(false)
    expect(isCarryFamily('breakout')).toBe(false)
    expect(isCarryFamily(null)).toBe(false)
    expect(isCarryFamily(undefined)).toBe(false)
  })
})

describe('fmtPfForFamily', () => {
  it('renders — for carry-family bots regardless of the raw profit factor', () => {
    // Regression: Grid BTC Spot / Funding Rate Harvesting showed PF 999.00 — a
    // meaningless number for bots with near-zero losing round-trips by construction.
    expect(fmtPfForFamily('carry', 999)).toBe('—')
    expect(fmtPfForFamily('carry', 0)).toBe('—')
  })

  it('renders the formatted profit factor for non-carry families', () => {
    expect(fmtPfForFamily('trend', 2.0021170102143877)).toBe('2.00')
    expect(fmtPfForFamily(null, 1.5)).toBe('1.50')
  })
})

describe('fmtWinRateForFamily', () => {
  it('renders — for carry-family bots regardless of the raw win rate', () => {
    // Regression: Funding Rate Harvesting showed 94.0% win rate — not a meaningful
    // metric for a portage bot judged on P&L, not round-trip win/loss.
    expect(fmtWinRateForFamily('carry', 0.94)).toBe('—')
  })

  it('renders the formatted win rate for non-carry families', () => {
    expect(fmtWinRateForFamily('trend', 0.5384615384615384)).toBe('53.8%')
  })
})
