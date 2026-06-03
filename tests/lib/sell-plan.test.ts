import { describe, it, expect } from 'vitest'
import { sellPlanLines } from '@/lib/sell-plan'

describe('sellPlanLines', () => {
  it('formats gain → sell amount + residual when sell pcts present', () => {
    const lines = sellPlanLines({ tp1_pct: 25, tp1_sell_pct: 25, tp2_pct: 50, tp2_sell_pct: 25, residual_pct: 50 })
    expect(lines).toEqual([
      '+25% → vendre 25%',
      '+50% → vendre 25%',
      'garder 50% (long terme)',
    ])
  })
  it('falls back to gain-only when sell pct is null (pre-backfill)', () => {
    const lines = sellPlanLines({ tp1_pct: 25, tp1_sell_pct: null, tp2_pct: 50, tp2_sell_pct: null, residual_pct: 50 })
    expect(lines).toEqual(['+25%', '+50%', 'garder 50% (long terme)'])
  })
  it('omits a palier when its gain threshold is null', () => {
    const lines = sellPlanLines({ tp1_pct: null, tp1_sell_pct: null, tp2_pct: null, tp2_sell_pct: null, residual_pct: null })
    expect(lines).toEqual([])
  })
  it('tactical remainder (legacy, no exit_state) states the rule, never "à la sortie"', () => {
    const lines = sellPlanLines({ tp1_pct: 25, tp1_sell_pct: 25, tp2_pct: 45, tp2_sell_pct: 25, residual_pct: 0 })
    expect(lines[2]).toBe('solder le reste (50%) si le cours casse sa tendance longue (clôture sous la MM50 orientée à la baisse)')
    expect(lines.join(' ')).not.toContain('à la sortie')
  })
  it('hold exit_state keeps the residual long-term', () => {
    const lines = sellPlanLines({ tp1_pct: 40, tp1_sell_pct: 25, tp2_pct: 80, tp2_sell_pct: 25, residual_pct: 50, exit_state: 'hold' })
    expect(lines[2]).toBe('garder 50% (long terme)')
  })
  it('intact exit_state states the trend-break rule', () => {
    const lines = sellPlanLines({ tp1_pct: 25, tp1_sell_pct: 25, tp2_pct: 45, tp2_sell_pct: 25, residual_pct: 0, exit_state: 'intact' })
    expect(lines[2]).toBe('solder le reste (50%) si le cours casse sa tendance longue (clôture sous la MM50 orientée à la baisse)')
  })
  it('broken exit_state states the action', () => {
    const lines = sellPlanLines({ tp1_pct: 25, tp1_sell_pct: 25, tp2_pct: 45, tp2_sell_pct: 25, residual_pct: 0, exit_state: 'broken' })
    expect(lines[2]).toBe('⚠️ tendance cassée : solder le reste (50%)')
  })
  it('tactical name with residual_pct 50 (SOL) exits on break, not "garder"', () => {
    const lines = sellPlanLines({ tp1_pct: 50, tp1_sell_pct: 25, tp2_pct: 100, tp2_sell_pct: 25, residual_pct: 50, exit_state: 'intact' })
    expect(lines[2]).toContain('solder le reste (50%)')
    expect(lines.join(' ')).not.toContain('garder')
  })
})
