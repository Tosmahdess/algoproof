import { describe, it, expect } from 'vitest'
import { isCarryFamily, fmtPfForFamily, fmtWinRateForFamily, fmtPfDisplay, fmtWinRateDisplay, isLowSample, LOW_SAMPLE_TRADES } from '@/lib/display'

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

describe('fmtPfDisplay / fmtWinRateDisplay and the low-sample threshold', () => {
  // These two assertions ran the other way until 2026-08-24 ("a low sample shows
  // '—'"). Inverted rather than deleted, because the behaviour is a deliberate
  // product decision and the next reader would otherwise "restore" the mask: on a
  // bot page filtered to long-only or short-only, blanking both figures removed
  // the answer to the exact question that had just been asked, and read as
  // missing data rather than as a judgement. The caveat did not disappear — it
  // moved to isLowSample, which still marks the trade count — so the reader gets
  // the figure AND the warning, where before they got neither.
  it('shows the profit factor even below the threshold', () => {
    expect(fmtPfDisplay('trend', LOW_SAMPLE_TRADES - 1, 1.5)).toBe('1.50')
    expect(fmtPfDisplay('trend', 1, 1.5)).toBe('1.50')
    expect(fmtPfDisplay('trend', LOW_SAMPLE_TRADES, 1.5)).toBe('1.50')
  })

  it('shows the win rate even below the threshold', () => {
    expect(fmtWinRateDisplay('trend', LOW_SAMPLE_TRADES - 1, 0.5)).toBe('50.0%')
    expect(fmtWinRateDisplay('trend', 1, 0.5)).toBe('50.0%')
    expect(fmtWinRateDisplay('trend', LOW_SAMPLE_TRADES, 0.5)).toBe('50.0%')
  })

  // The guards that DID survive, pinned so that lifting the sample gate is not
  // mistaken for having lifted all of them.
  it('still hides both figures for a carry bot, at any sample size', () => {
    expect(fmtPfDisplay('carry', 500, 1.5)).toBe('—')
    expect(fmtWinRateDisplay('carry', 500, 0.5)).toBe('—')
  })

  it('still renders a loss-free profit factor as infinity, not as a number', () => {
    expect(fmtPfDisplay('trend', 3, 1000)).toBe('∞')
  })

  // isLowSample is now the ONLY carrier of the caveat, so its bounds matter more
  // than they did when it merely echoed a mask that was applied elsewhere too.
  it('keeps isLowSample as the marker the figures now rely on', () => {
    expect(isLowSample(LOW_SAMPLE_TRADES - 1)).toBe(true)
    expect(isLowSample(LOW_SAMPLE_TRADES)).toBe(false)
    expect(isLowSample(0)).toBe(false)
  })
})
