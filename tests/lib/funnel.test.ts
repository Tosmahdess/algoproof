import { describe, it, expect } from 'vitest'
import { verdictTotals, CORRECTED_ENGINE_SINCE } from '@/lib/funnel'

// Any row without a post-fix timestamp is filtered out (see the freshness block
// below), so fixtures that exercise the swept/judged split must carry one.
const FRESH = '2026-08-14T20:39:00Z'

describe('verdictTotals — swept vs judged (top-K finalize, 2026-08-06)', () => {
  it('separates the swept corpus from the judged count', () => {
    // A modern unit: 570 000 behaviours enumerated, top 20 000 judged. Summing
    // n_behaviors as "judged/tested" is the bug that put 5.8M on the flotte
    // while the cockpit said 109k.
    const rows = [
      { n_behaviors: 570_000, n_go: 5, n_marginal: 995, n_no_go: 19_000, published_at: FRESH },
      // An old-semantics unit, where everything swept was judged.
      { n_behaviors: 10_417, n_go: 0, n_marginal: 2, n_no_go: 10_415, published_at: FRESH },
    ]
    expect(verdictTotals(rows)).toEqual({ n_swept: 580_417, n_judged: 30_417 })
  })

  it('returns zeros on an empty corpus', () => {
    expect(verdictTotals([])).toEqual({ n_swept: 0, n_judged: 0 })
  })

  // D-APX-KLAD-4 (2026-08-15): a ladder row (greedy K4-5 extension, kmax=4/5,
  // search_mode='ladder') carries configs DISJOINT from the K<=3 corpus, and its
  // n_behaviors is the judged-candidate count, never the combinatorial space. Both
  // surfaces sum it the same way — twin fixture: algolab
  // web/lib/__tests__/engine-aggregate.test.ts, ladder case.
  it('adds ladder rows to the same totals — disjoint configs, additive by construction', () => {
    const rows = [
      { n_behaviors: 20_000, n_go: 1, n_marginal: 4, n_no_go: 19_995, published_at: FRESH },
      { n_behaviors: 180, n_go: 1, n_marginal: 0, n_no_go: 179, published_at: FRESH },
    ]
    expect(verdictTotals(rows)).toEqual({ n_swept: 20_180, n_judged: 20_180 })
  })
})

describe('freshness — the flotte must count what the cockpit counts', () => {
  // 2026-08-12: three weeks of verdicts were produced by an engine whose entry
  // signal had silently degraded (pandas 3.0 made a negation a no-op). The lab
  // cockpit stopped displaying anything judged before the fix. This surface kept
  // summing everything, so the two disagreed by 151 359 on BOTH swept and judged
  // — the exact shape of the 2026-08-08 incident this file's header describes,
  // reopened from the other side.
  it('drops rows judged before the corrected engine started', () => {
    const rows = [
      { n_behaviors: 100, n_go: 1, n_marginal: 1, n_no_go: 8, published_at: '2026-08-11T07:36:00Z' },
      { n_behaviors: 200, n_go: 2, n_marginal: 2, n_no_go: 16, published_at: '2026-08-14T20:39:00Z' },
    ]

    expect(verdictTotals(rows)).toEqual({ n_swept: 200, n_judged: 20 })
  })

  it('treats a missing timestamp as stale, never as a default pass', () => {
    const rows = [{ n_behaviors: 100, n_go: 1, n_marginal: 1, n_no_go: 8 }]

    expect(verdictTotals(rows)).toEqual({ n_swept: 0, n_judged: 0 })
  })

  it('uses the same cutoff as the lab cockpit', () => {
    // Twin of algolab web/lib/engine-freshness.ts::CORRECTED_ENGINE_SINCE.
    // Two repos, two deployments: the constant is duplicated on purpose, and
    // pinned on both sides so a change to one is visible in the other's diff.
    expect(CORRECTED_ENGINE_SINCE).toBe('2026-08-12T19:38:00Z')
  })
})
