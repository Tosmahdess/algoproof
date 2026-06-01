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
})
