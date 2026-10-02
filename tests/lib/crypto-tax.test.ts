import { describe, it, expect } from 'vitest'
import {
  capitalGain, isExempt, flatTax, baremeTax, compare,
  PFU_FLAT_RATE, SOCIAL_RATE, EXEMPTION_CESSION_EUR, parseAmount,
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

// Audit 2026-10, n° 1 and 18: `parseFloat("15 000")` read 15, so « 10 000 » then
// « 15 000 » showed a 0 € tax; « abc » read 0 in silence and « -500 » was taken.
describe('parseAmount', () => {
  it('reads French thousands separators: spaces, no-break spaces and dots', () => {
    expect(parseAmount('15 000')).toEqual({ ok: true, value: 15000 })
    expect(parseAmount('15 000')).toEqual({ ok: true, value: 15000 })
    expect(parseAmount('15 000')).toEqual({ ok: true, value: 15000 })
    expect(parseAmount('1.250.000')).toEqual({ ok: true, value: 1250000 })
    expect(parseAmount(' 10 000 ')).toEqual({ ok: true, value: 10000 })
  })
  it('accepts a decimal comma, with or without thousands', () => {
    expect(parseAmount('1500,5')).toEqual({ ok: true, value: 1500.5 })
    expect(parseAmount('15 000,50')).toEqual({ ok: true, value: 15000.5 })
    expect(parseAmount('15.000,50')).toEqual({ ok: true, value: 15000.5 })
  })
  it('still reads a plain number and a lone decimal point', () => {
    expect(parseAmount('1000')).toEqual({ ok: true, value: 1000 })
    expect(parseAmount('1500.5')).toEqual({ ok: true, value: 1500.5 })
    expect(parseAmount('0')).toEqual({ ok: true, value: 0 })
  })
  it('tolerates a trailing euro sign', () => {
    expect(parseAmount('1 000 €')).toEqual({ ok: true, value: 1000 })
  })
  it('reports an empty field as empty, not as an error', () => {
    expect(parseAmount('')).toEqual({ ok: false, reason: 'empty' })
    expect(parseAmount('   ')).toEqual({ ok: false, reason: 'empty' })
  })
  it('refuses a negative amount', () => {
    expect(parseAmount('-500')).toEqual({ ok: false, reason: 'negative' })
    expect(parseAmount('−500')).toEqual({ ok: false, reason: 'negative' })
  })
  it('refuses anything that is not a number', () => {
    for (const s of ['abc', '12abc', '1,2,3', '1..2', ',', '.', '1e5', 'Infinity', 'NaN', '1 0 0 0,0,0']) {
      expect(parseAmount(s), s).toEqual({ ok: false, reason: 'invalid' })
    }
  })
})
