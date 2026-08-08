import { describe, it, expect } from 'vitest'
import { verdictTotals } from '@/lib/funnel'

describe('verdictTotals — swept vs judged (top-K finalize, 2026-08-06)', () => {
  it('separates the swept corpus from the judged count', () => {
    // A modern unit: 570 000 behaviours enumerated, top 20 000 judged. Summing
    // n_behaviors as "judged/tested" is the bug that put 5.8M on the flotte
    // while the cockpit said 109k.
    const rows = [
      { n_behaviors: 570_000, n_go: 5, n_marginal: 995, n_no_go: 19_000 },
      // An old-semantics unit, where everything swept was judged.
      { n_behaviors: 10_417, n_go: 0, n_marginal: 2, n_no_go: 10_415 },
    ]
    expect(verdictTotals(rows)).toEqual({ n_swept: 580_417, n_judged: 30_417 })
  })

  it('returns zeros on an empty corpus', () => {
    expect(verdictTotals([])).toEqual({ n_swept: 0, n_judged: 0 })
  })
})
