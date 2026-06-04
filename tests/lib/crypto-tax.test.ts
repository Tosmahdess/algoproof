import { describe, it, expect } from 'vitest'
import {
  capitalGain, isExempt, flatTax, baremeTax, compare,
  PFU_FLAT_RATE, SOCIAL_RATE, EXEMPTION_CESSION_EUR,
} from '@/lib/crypto-tax'

describe('crypto-tax constants', () => {
  it('flat rate is IR + social (2026)', () => {
    expect(PFU_FLAT_RATE).toBeCloseTo(0.314, 3)
    expect(SOCIAL_RATE).toBeCloseTo(0.186, 3)
    expect(EXEMPTION_CESSION_EUR).toBe(305)
  })
})

describe('capitalGain', () => {
  it('returns the gain when sold > invested', () => {
    expect(capitalGain(1000, 1500)).toBe(500)
  })
  it('clamps a loss to 0 (moins-value)', () => {
    expect(capitalGain(1000, 600)).toBe(0)
  })
})

describe('isExempt', () => {
  it('exempt when total cession <= 305 and > 0', () => {
    expect(isExempt(300)).toBe(true)
    expect(isExempt(305)).toBe(true)
    expect(isExempt(306)).toBe(false)
    expect(isExempt(0)).toBe(false)
  })
})

describe('flatTax / baremeTax', () => {
  it('flat tax is gain * 0.314', () => {
    expect(flatTax(500)).toBeCloseTo(157, 2)
  })
  it('bareme tax adds social rate to the TMI bracket', () => {
    expect(baremeTax(500, 0.30)).toBeCloseTo(243, 2) // (0.30+0.186)*500
    expect(baremeTax(500, 0)).toBeCloseTo(93, 2)      // (0+0.186)*500
  })
})

describe('compare', () => {
  it('flat is cheaper for a high TMI -> taxDue = flat', () => {
    const r = compare(1000, 1500, 0.30)
    expect(r.gain).toBe(500)
    expect(r.best).toBe('flat')
    expect(r.taxDue).toBeCloseTo(157, 2)
  })
  it('bareme is cheaper for TMI 0 -> taxDue = bareme', () => {
    const r = compare(1000, 1500, 0)
    expect(r.best).toBe('bareme')
    expect(r.taxDue).toBeCloseTo(93, 2)
  })
  it('exempt cession -> taxDue 0', () => {
    const r = compare(100, 300, 0.30)
    expect(r.exempt).toBe(true)
    expect(r.taxDue).toBe(0)
  })
  it('loss -> gain 0, taxDue 0', () => {
    const r = compare(1000, 600, 0.30)
    expect(r.gain).toBe(0)
    expect(r.taxDue).toBe(0)
  })
})
