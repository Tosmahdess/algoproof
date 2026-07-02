// tests/lib/conformity.test.ts
import { describe, it, expect } from 'vitest'
import { assessConformity } from '@/lib/conformity'
import type { BotExpectations } from '@/lib/bot-expectations'

const baseExp: BotExpectations = {
  source: 'test gate',
  registeredAt: '2026-01-01',
  pfFloor: 1.2,
  maxDrawdown: 0.15,
  killCriteria: ['kill rule'],
}

const stats = (pf: number, dd: number, trades: number) => ({
  profit_factor: pf,
  max_drawdown: dd,
  total_trades: trades,
})

describe('assessConformity', () => {
  it('returns insufficient below 20 trades when nothing breaches', () => {
    const r = assessConformity(baseExp, stats(2.0, 0.03, 5))
    expect(r.status).toBe('insufficient')
    expect(r.narrative.length).toBeGreaterThan(0)
  })

  it('ignores PF below 20 trades (still insufficient, not breach)', () => {
    const r = assessConformity(baseExp, stats(0.5, 0.03, 10))
    expect(r.status).toBe('insufficient')
    // no PF check row at low sample
    expect(r.checks.find(c => c.label.toLowerCase().includes('rentabilit'))).toBeUndefined()
  })

  it('flags DD breach even at low sample (capital-based, meaningful from trade 1)', () => {
    // maxDrawdown 0.15 → breach above 0.1875
    const r = assessConformity(baseExp, stats(2.0, 0.2, 3))
    expect(r.status).toBe('breach')
  })

  it('returns ok when ≥20 trades, DD low, PF above floor', () => {
    const r = assessConformity(baseExp, stats(1.5, 0.05, 40))
    expect(r.status).toBe('ok')
    expect(r.checks.every(c => c.status === 'ok')).toBe(true)
  })

  it('returns watch when DD is inside but close to the limit (>80%)', () => {
    // 0.13 > 0.15 × 0.8 = 0.12, but ≤ 0.15 × 1.25
    const r = assessConformity(baseExp, stats(1.5, 0.13, 40))
    expect(r.status).toBe('watch')
  })

  it('returns watch when PF is below the floor but still profitable (≥20 trades)', () => {
    const r = assessConformity(baseExp, stats(1.1, 0.05, 40))
    expect(r.status).toBe('watch')
  })

  it('returns breach when PF < 1.0 after 20 trades', () => {
    const r = assessConformity(baseExp, stats(0.8, 0.05, 40))
    expect(r.status).toBe('breach')
  })

  it('breach wins over watch', () => {
    // DD watch (0.13) + PF breach (0.8) → breach
    const r = assessConformity(baseExp, stats(0.8, 0.13, 40))
    expect(r.status).toBe('breach')
  })

  it('skips the DD check when maxDrawdown is not defined', () => {
    const exp: BotExpectations = { ...baseExp, maxDrawdown: undefined }
    const r = assessConformity(exp, stats(1.5, 0.9, 40))
    expect(r.status).toBe('ok')
    expect(r.checks.find(c => c.label.toLowerCase().includes('drawdown'))).toBeUndefined()
  })

  it('skips the PF check when pfFloor is not defined', () => {
    const exp: BotExpectations = { ...baseExp, pfFloor: undefined }
    const r = assessConformity(exp, stats(0.5, 0.05, 40))
    expect(r.status).toBe('ok')
  })

  it('exposes expected vs realized strings on each check', () => {
    const r = assessConformity(baseExp, stats(1.5, 0.05, 40))
    const dd = r.checks.find(c => c.label.toLowerCase().includes('drawdown'))
    expect(dd?.expected).toContain('15')
    expect(dd?.realized).toContain('5')
    const pf = r.checks.find(c => c.label.toLowerCase().includes('rentabilit'))
    expect(pf?.expected).toContain('1.2')
    expect(pf?.realized).toContain('1.5')
  })
})
