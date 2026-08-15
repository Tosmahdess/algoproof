// src/lib/funnel.ts
// The denominator nobody else publishes.
//
// The False Strategy Theorem (Bailey & López de Prado, SSRN 3221798) says no
// Sharpe threshold can reject a worthless strategy while the number of trials is
// hidden. Composer lists ~2600 strategies, Tradetron ~10000, MQL5 thousands —
// none publishes how many configurations were searched. These numbers are that
// count, which is what makes every other figure on the site interpretable.
//
// TWO numbers since 2026-08-08, because the engine's top-K finalize (2026-08-06)
// split what used to be one: `n_behaviors` on engine verdicts now carries the
// SWEPT corpus (everything enumerated and deduplicated) while only the top
// 20 000 behaviours per unit are actually judged. The old single "n_tested"
// summed n_behaviors and labelled it « testées » — 5.8M — while the cockpit on
// lab.algoproof.fr showed its judged count — 109k. Same table, two semantics.
// Both surfaces now print the same pair under the same names: swept and judged.
//
// Counts come from engine_verdicts_public — the redacted VIEW, not the base
// table — because a view executes with its owner's rights and therefore keeps
// working after the planned revocation of anon SELECT on engine_verdicts
// (learnings 2026-08-02; the view was applied in prod 2026-08-08). Promoted and
// live still come from the funnel_counts view over `bots`.
import { supabase } from './supabase'
import { paginateAll } from './paginate'

export interface FunnelCounts {
  n_swept: number
  n_judged: number
  n_promoted: number
  n_live: number
}

export interface VerdictCountRow {
  n_behaviors: number
  n_go: number
  n_marginal: number
  n_no_go: number
  published_at?: string | null
}

// 2026-08-12 19:38 UTC — the moment the corrected engine started producing, after
// pandas 3.0 had silently turned the entry de-duplication idiom into a no-op for
// three weeks (an entry EVENT degrading into an entry STATE). Verdicts judged
// before it are not displayed anywhere.
//
// Twin of algolab `web/lib/engine-freshness.ts::CORRECTED_ENGINE_SINCE`. Two repos,
// two deployments, so the constant is duplicated on purpose — and pinned by a test
// on both sides, because the failure this file's header describes ("same table, two
// semantics") is exactly what happens when the two surfaces drift apart. They did,
// again, on 2026-08-15: the cockpit filtered and this one did not, so the flotte
// over-counted by 151 359 on BOTH swept and judged.
export const CORRECTED_ENGINE_SINCE = '2026-08-12T19:38:00Z'

const CUTOFF = Date.parse(CORRECTED_ENGINE_SINCE)

/** A row counts only if we know it was judged after the fix. An absent or
 *  unparseable timestamp reads as stale — "we cannot tell" must never pass. */
function judgedByCorrectedEngine(row: VerdictCountRow): boolean {
  if (!row.published_at) return false
  const t = Date.parse(row.published_at)
  return Number.isFinite(t) && t >= CUTOFF
}

/** Pure aggregation, so the swept/judged split is testable without Supabase. */
export function verdictTotals(rows: VerdictCountRow[]): { n_swept: number; n_judged: number } {
  return rows.filter(judgedByCorrectedEngine).reduce(
    (acc, r) => ({
      n_swept: acc.n_swept + r.n_behaviors,
      n_judged: acc.n_judged + r.n_go + r.n_marginal + r.n_no_go,
    }),
    { n_swept: 0, n_judged: 0 },
  )
}

export async function getFunnelCounts(): Promise<FunnelCounts | null> {
  try {
    const [botCounts, verdictRows] = await Promise.all([
      supabase.from('funnel_counts').select('n_promoted,n_live').single(),
      // paginateAll: PostgREST caps a select at 1000 rows, and a silently
      // truncated corpus would understate the site's strongest claim.
      paginateAll<VerdictCountRow>(async (from, to) => {
        const { data, error } = await supabase
          .from('engine_verdicts_public')
          .select('n_behaviors,n_go,n_marginal,n_no_go,published_at')
          .range(from, to)
        if (error) throw new Error(error.message)
        return data ?? []
      }),
    ])
    if (botCounts.error || !botCounts.data) return null
    const { n_swept, n_judged } = verdictTotals(verdictRows)
    return {
      n_swept,
      n_judged,
      n_promoted: botCounts.data.n_promoted,
      n_live: botCounts.data.n_live,
    }
  } catch {
    // Every caller (home, La flotte, OG image) degrades to "no counter" —
    // rendering nothing beats rendering a zero denominator.
    return null
  }
}
