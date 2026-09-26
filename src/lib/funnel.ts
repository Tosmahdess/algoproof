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
  // The three ways a judged configuration leaves the engine — the same split as
  // the four KPI cards at the top of lab.algoproof.fr/cockpit. Added 2026-09-24
  // so the home can print that same read (owner). They always sum to n_judged.
  n_go: number
  n_marginal: number
  n_no_go: number
  n_promoted: number
  n_live: number
  /** Per strategy, from the same rows as the totals. Optional: callers and
   *  fixtures that only need the totals may leave it out. */
  by_base?: BaseSurvival[]
}

export interface VerdictCountRow {
  // Identity columns, REQUIRED. They are not displayed — they exist so this
  // surface can resolve one generation per rung, which it could not do before
  // 2026-09-22 because the query never fetched them. See selectNewestPerPair.
  base: string
  tf: string
  kmax: number
  dataset_version: string
  n_behaviors: number
  n_go: number
  n_marginal: number
  n_no_go: number
  published_at?: string | null
}

/** The rung's identity ACROSS generations: "the same pair, re-run".
 *  Twin of algolab web/lib/engine-filters.ts::enginePairKey. */
function pairKey(row: Pick<VerdictCountRow, 'base' | 'tf' | 'kmax'>): string {
  return `${row.base}|${row.tf}|${row.kmax}`
}

/**
 * One generation per rung: the newest.
 *
 * THE DEFECT THIS CLOSES (owner, 2026-09-22): this surface summed EVERY verdict
 * row, so a rung swept twice was counted twice. It printed « Jugées au gantelet
 * 1 851 651 » while lab.algoproof.fr's cockpit printed 1 600 883 for the same
 * words — a 250 768 gap that is entirely superseded generations.
 *
 * It is the SECOND time the two surfaces drifted on this exact pair. The first
 * (2026-08-15, over-count of 151 359) is described in this file's header and
 * pinned by the freshness test below; the cockpit had gained a filter and this
 * one had not. Same shape, different filter: the cockpit gained the per-rung
 * generation default on 2026-09-04 and this one, again, did not.
 *
 * Twin of algolab web/lib/engine-filters.ts::selectNewestPerPair — two repos,
 * two deployments, so the rule is duplicated on purpose and pinned on both sides.
 * Datasets are named data_YYYYMMDD, so lexical max is chronological max.
 *
 * ORDER MATTERS: the freshness cutoff runs FIRST, then this. The cockpit does
 * the same (dropStaleRows in getEngineVerdicts, then the per-pair default in
 * resolveEngineFilters), and reversing them would differ whenever a rung's
 * newest generation is itself pre-cutoff.
 */
export function selectNewestPerPair<
  T extends Pick<VerdictCountRow, 'base' | 'tf' | 'kmax' | 'dataset_version'>,
>(rows: T[]): T[] {
  const newest = new Map<string, string>()
  for (const row of rows) {
    const key = pairKey(row)
    const current = newest.get(key)
    if (current === undefined || row.dataset_version > current) {
      newest.set(key, row.dataset_version)
    }
  }
  return rows.filter((row) => newest.get(pairKey(row)) === row.dataset_version)
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
export function verdictTotals(rows: VerdictCountRow[]): Omit<FunnelCounts, 'n_promoted' | 'n_live'> {
  return selectNewestPerPair(rows.filter(judgedByCorrectedEngine)).reduce(
    (acc, r) => ({
      n_swept: acc.n_swept + r.n_behaviors,
      n_judged: acc.n_judged + r.n_go + r.n_marginal + r.n_no_go,
      n_go: acc.n_go + r.n_go,
      n_marginal: acc.n_marginal + r.n_marginal,
      n_no_go: acc.n_no_go + r.n_no_go,
    }),
    { n_swept: 0, n_judged: 0, n_go: 0, n_marginal: 0, n_no_go: 0 },
  )
}


/** One engine strategy (`base`), summed over its rungs. */
export interface BaseSurvival {
  base: string
  judged: number
  retained: number
}

/** Below this many judged configurations a strategy's share retained is noise:
 *  the ranking on the home leaves it out (the full list still shows it). */
export const MIN_JUDGED_FOR_RANKING = 10_000

/**
 * The funnel, per strategy: which ones survive the gauntlet (counter-audit
 * 2026-09-26 — the four bars said nothing the numbers did not).
 *
 * Same rows, same two rules as verdictTotals, in the same order: freshness first,
 * then the newest generation per rung. A per-strategy sum computed any other way
 * would disagree with the total printed beside it, the drift this file has
 * already fixed twice. Sorted by share retained, highest first.
 */
export function survivalByBase(rows: VerdictCountRow[]): BaseSurvival[] {
  const byBase = new Map<string, BaseSurvival>()
  for (const r of selectNewestPerPair(rows.filter(judgedByCorrectedEngine))) {
    const b = byBase.get(r.base) ?? { base: r.base, judged: 0, retained: 0 }
    b.judged += r.n_go + r.n_marginal + r.n_no_go
    b.retained += r.n_go
    byBase.set(r.base, b)
  }
  const share = (b: BaseSurvival) => (b.judged > 0 ? b.retained / b.judged : 0)
  return [...byBase.values()]
    .filter(b => b.judged > 0)
    .sort((x, y) => share(y) - share(x) || y.judged - x.judged)
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
          // base/tf/kmax/dataset_version are fetched for DEDUPLICATION, never for
          // display: without them this query cannot tell a re-swept rung from a
          // second campaign, which is how it came to over-count by 250 768.
          .select('base,tf,kmax,dataset_version,n_behaviors,n_go,n_marginal,n_no_go,published_at')
          .range(from, to)
        if (error) throw new Error(error.message)
        return data ?? []
      }),
    ])
    if (botCounts.error || !botCounts.data) return null
    return {
      ...verdictTotals(verdictRows),
      by_base: survivalByBase(verdictRows),
      n_promoted: botCounts.data.n_promoted,
      n_live: botCounts.data.n_live,
    }
  } catch {
    // Every caller (home, La flotte, OG image) degrades to "no counter" —
    // rendering nothing beats rendering a zero denominator.
    return null
  }
}
