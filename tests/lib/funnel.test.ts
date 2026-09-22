import { describe, it, expect } from 'vitest'
import { verdictTotals, selectNewestPerPair, CORRECTED_ENGINE_SINCE } from '@/lib/funnel'
import type { VerdictCountRow } from '@/lib/funnel'

// Any row without a post-fix timestamp is filtered out (see the freshness block
// below), so fixtures that exercise the swept/judged split must carry one.
const FRESH = '2026-08-14T20:39:00Z'

// Every fixture names its RUNG. Since 2026-09-22 the identity columns are
// required, because without them this surface cannot tell a re-swept rung from
// a second campaign — which is how it came to double-count. Fixtures that mean
// "two different campaigns" must therefore differ in base, tf or kmax, or the
// assertion silently measures deduplication instead of what it claims.
const rung = (
  o: Partial<VerdictCountRow> & Pick<VerdictCountRow, 'n_behaviors' | 'n_go' | 'n_marginal' | 'n_no_go'>,
): VerdictCountRow => ({
  base: 'EMAcross', tf: 'H1', kmax: 3, dataset_version: 'data_20260831',
  published_at: FRESH, ...o,
})

describe('verdictTotals — swept vs judged (top-K finalize, 2026-08-06)', () => {
  it('separates the swept corpus from the judged count', () => {
    // A modern unit: 570 000 behaviours enumerated, top 20 000 judged. Summing
    // n_behaviors as "judged/tested" is the bug that put 5.8M on the flotte
    // while the cockpit said 109k.
    const rows = [
      rung({ n_behaviors: 570_000, n_go: 5, n_marginal: 995, n_no_go: 19_000 }),
      // An old-semantics unit, where everything swept was judged. A DIFFERENT
      // rung, or the newest-generation rule would collapse the pair.
      rung({ base: 'KAMAcross', tf: 'D1', n_behaviors: 10_417, n_go: 0, n_marginal: 2, n_no_go: 10_415 }),
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
      rung({ kmax: 3, n_behaviors: 20_000, n_go: 1, n_marginal: 4, n_no_go: 19_995 }),
      // kmax 5 is a different rung, so it is additive and not a re-run.
      rung({ kmax: 5, n_behaviors: 180, n_go: 1, n_marginal: 0, n_no_go: 179 }),
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
      rung({ base: 'Stale', n_behaviors: 100, n_go: 1, n_marginal: 1, n_no_go: 8, published_at: '2026-08-11T07:36:00Z' }),
      rung({ base: 'Fresh', n_behaviors: 200, n_go: 2, n_marginal: 2, n_no_go: 16, published_at: '2026-08-14T20:39:00Z' }),
    ]

    expect(verdictTotals(rows)).toEqual({ n_swept: 200, n_judged: 20 })
  })

  it('treats a missing timestamp as stale, never as a default pass', () => {
    const rows = [rung({ n_behaviors: 100, n_go: 1, n_marginal: 1, n_no_go: 8, published_at: null })]

    expect(verdictTotals(rows)).toEqual({ n_swept: 0, n_judged: 0 })
  })

  // ── THE DEFECT, 2026-09-22 ────────────────────────────────────────────────
  // Reported by the owner from the two published pages: « Jugées au gantelet
  // 1 851 651 » here against 1 600 883 on lab.algoproof.fr/cockpit, for the same
  // words. The gap — 250 768 — was entirely superseded generations: this surface
  // summed every verdict row, so a rung swept twice counted twice.
  //
  // Second occurrence of the same drift. The first (2026-08-15, 151 359) is the
  // test above: the cockpit gained a filter and this one did not. This time the
  // cockpit gained the per-rung generation default (2026-09-04) and this one,
  // again, did not.
  it('counts a re-swept rung ONCE, at its newest generation', () => {
    const rows = [
      rung({ dataset_version: 'data_20260710', n_behaviors: 900_000, n_go: 9, n_marginal: 91, n_no_go: 19_900 }),
      rung({ dataset_version: 'data_20260831', n_behaviors: 570_000, n_go: 5, n_marginal: 995, n_no_go: 19_000 }),
    ]
    // The July generation is superseded: neither its swept corpus nor its
    // judged count may reach the counter.
    expect(verdictTotals(rows)).toEqual({ n_swept: 570_000, n_judged: 20_000 })
  })

  it('keeps every rung that was never re-run, including across bases and depths', () => {
    const rows = [
      rung({ base: 'EMAcross', tf: 'H1', kmax: 3, n_behaviors: 100, n_go: 1, n_marginal: 0, n_no_go: 9 }),
      rung({ base: 'EMAcross', tf: 'H1', kmax: 5, n_behaviors: 200, n_go: 0, n_marginal: 1, n_no_go: 9 }),
      rung({ base: 'EMAcross', tf: 'D1', kmax: 3, n_behaviors: 400, n_go: 0, n_marginal: 0, n_no_go: 10 }),
      rung({ base: 'KAMAcross', tf: 'H1', kmax: 3, n_behaviors: 800, n_go: 0, n_marginal: 0, n_no_go: 10 }),
    ]
    expect(verdictTotals(rows)).toEqual({ n_swept: 1_500, n_judged: 40 })
  })

  // The cutoff runs FIRST, then the generation rule — same order as the cockpit.
  // Reversed, a rung whose newest generation is pre-cutoff would lose its fresh
  // older generation too, and the two surfaces would disagree again.
  it('resolves the newest generation AMONG the fresh rows, not before the cutoff', () => {
    const rows = [
      rung({ dataset_version: 'data_20260901', n_behaviors: 999, n_go: 9, n_marginal: 9, n_no_go: 9, published_at: '2026-08-01T00:00:00Z' }),
      rung({ dataset_version: 'data_20260831', n_behaviors: 500, n_go: 1, n_marginal: 1, n_no_go: 8 }),
    ]
    expect(verdictTotals(rows)).toEqual({ n_swept: 500, n_judged: 10 })
  })

  it('selectNewestPerPair is the twin of the cockpit rule, keyed on base+tf+kmax', () => {
    const kept = selectNewestPerPair([
      { base: 'A', tf: 'H1', kmax: 3, dataset_version: 'data_20260101' },
      { base: 'A', tf: 'H1', kmax: 3, dataset_version: 'data_20260202' },
      { base: 'A', tf: 'H1', kmax: 5, dataset_version: 'data_20260101' },
    ])
    expect(kept).toEqual([
      { base: 'A', tf: 'H1', kmax: 3, dataset_version: 'data_20260202' },
      { base: 'A', tf: 'H1', kmax: 5, dataset_version: 'data_20260101' },
    ])
  })

  it('uses the same cutoff as the lab cockpit', () => {
    // Twin of algolab web/lib/engine-freshness.ts::CORRECTED_ENGINE_SINCE.
    // Two repos, two deployments: the constant is duplicated on purpose, and
    // pinned on both sides so a change to one is visible in the other's diff.
    expect(CORRECTED_ENGINE_SINCE).toBe('2026-08-12T19:38:00Z')
  })
})
