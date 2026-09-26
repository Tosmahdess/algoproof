import { describe, it, expect } from 'vitest'
import { survivalByBase, verdictTotals, MIN_JUDGED_FOR_RANKING } from '@/lib/funnel'
import type { VerdictCountRow } from '@/lib/funnel'

// The per-strategy view replaces the funnel's bars (counter-audit 2026-09-26):
// the owner found four full-width bars said nothing the numbers did not. What the
// numbers alone do not say is WHICH strategies survive. It must be computed from
// the same rows, through the same freshness and newest-generation rules, or the
// home prints two totals that disagree (funnel.ts has drifted that way twice).

const FRESH = '2026-08-14T20:39:00Z'
const STALE = '2026-08-01T00:00:00Z'

const rung = (
  o: Partial<VerdictCountRow> & Pick<VerdictCountRow, 'base' | 'n_go' | 'n_marginal' | 'n_no_go'>,
): VerdictCountRow => ({
  tf: 'H1', kmax: 3, dataset_version: 'data_20260831', n_behaviors: 100_000,
  published_at: FRESH, ...o,
})

describe('survivalByBase', () => {
  const rows: VerdictCountRow[] = [
    rung({ base: 'KeltnerBreak', n_go: 60, n_marginal: 940, n_no_go: 9_000 }),
    rung({ base: 'KeltnerBreak', tf: 'D1', n_go: 40, n_marginal: 960, n_no_go: 9_000 }),
    rung({ base: 'EMAcross', n_go: 4, n_marginal: 996, n_no_go: 19_000 }),
    // An older generation of the same EMA rung: superseded, never counted.
    rung({ base: 'EMAcross', dataset_version: 'data_20260815', n_go: 900, n_marginal: 100, n_no_go: 19_000 }),
    // Judged before the engine fix: stale, never counted.
    rung({ base: 'FVG', published_at: STALE, n_go: 500, n_marginal: 0, n_no_go: 500 }),
    rung({ base: 'OrderBlock', n_go: 0, n_marginal: 0, n_no_go: 20_000 }),
  ]

  it('sums each strategy over its rungs, newest generation only, fresh rows only', () => {
    const byBase = survivalByBase(rows)
    const keltner = byBase.find(b => b.base === 'KeltnerBreak')!
    expect(keltner).toMatchObject({ judged: 20_000, retained: 100 })
    const ema = byBase.find(b => b.base === 'EMAcross')!
    expect(ema).toMatchObject({ judged: 20_000, retained: 4 })
    expect(byBase.find(b => b.base === 'FVG')).toBeUndefined()
  })

  it('adds up to the funnel total: one set of rows, one count', () => {
    const judged = survivalByBase(rows).reduce((s, b) => s + b.judged, 0)
    const retained = survivalByBase(rows).reduce((s, b) => s + b.retained, 0)
    expect(judged).toBe(verdictTotals(rows).n_judged)
    expect(retained).toBe(verdictTotals(rows).n_go)
  })

  it('sorts by share retained, highest first, a strategy that kept nothing last', () => {
    expect(survivalByBase(rows).map(b => b.base)).toEqual(['KeltnerBreak', 'EMAcross', 'OrderBlock'])
  })

  it('ranks only strategies judged often enough to say something', () => {
    expect(MIN_JUDGED_FOR_RANKING).toBe(10_000)
  })
})
