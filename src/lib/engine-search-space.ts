// How wide the engine's sweep actually is, read from the engine's own published counts.
//
// This exists because the strategy explainer used to state six of these numbers as
// literals in prose. A number written by hand becomes false on its own: the parameter
// grid, the filter library and the exit set all change as the engine evolves, and nothing
// makes the sentence follow. The rule (see _me/learnings.md) is that a figure which moves
// by itself gets derived, and only a dated historical fact stays frozen.
//
// Source: view `engine_search_space_public` (migration 030). Counts only, never parameter
// values — nothing here can leak a recipe.
// The Supabase client is imported LAZILY, inside getSearchSpace, on purpose.
// `@/lib/supabase-server` builds its client at module evaluation and throws
// "supabaseUrl is required" without env. A top-level import here would make the COPY
// module (gauntlet-explainer.ts, which only needs the pure helpers below) impossible to
// import without a database — it broke an existing copy test that had asked for nothing.
// A copy module must stay importable with no infrastructure.

export interface SearchSpace {
  base: string
  tf: string
  /** Size of the parameter grid swept for this base. NULL since 2026-08-24: the
   *  publisher stopped writing the three grid sizes (measured on the production
   *  table, audit 2026-09-25 P0-3). The corpus and judged counts are still written. */
  nParams: number | null
  /** Entry-filter combinations swept (bounded-K library). Same nullability. */
  nFilterConfigs: number | null
  /** Exit policies swept. Same nullability. */
  nExits: number | null
  /** DEDUPLICATED corpus: variants producing an identical trade sequence count once. */
  nBehaviors: number
  /** Top-K actually sent through the gauntlet. */
  nJudged: number
}

/** One row of `engine_search_space_public`, as the view serves it. */
export interface SearchSpaceRow {
  base: string
  tf: string
  n_params: number | string | null
  n_filter_configs: number | string | null
  n_exits: number | string | null
  n_behaviors: number | string | null
  n_judged: number | string | null
  published_at: string
}

/** The unit the explainer uses as its one worked example. Deliberately a single named
 *  cell, not an average: the 9 bases have parameter grids from 6 to 66 entries, so any
 *  "the engine sweeps N variants" claim across all of them would be false for most. */
export const WORKED_EXAMPLE = { base: 'EMAcross', tf: 'D1' } as const

/** A publish writes several rows a second apart, one per rung of the ladder; the
 *  corpus row is the one with the largest behaviour count. Rows further than this
 *  from the newest one belong to an older publish and are ignored. */
const BATCH_WINDOW_MS = 5 * 60 * 1000

/** The corpus row of the NEWEST publish. Measured on 2026-09-25: taking the newest
 *  row alone returned a rung (1 620 behaviours) instead of the corpus (3 931 894). */
export function pickCorpusRow(rows: readonly SearchSpaceRow[]): SearchSpaceRow | null {
  if (rows.length === 0) return null
  const newest = Math.max(...rows.map(r => Date.parse(r.published_at)))
  const batch = rows.filter(r => newest - Date.parse(r.published_at) <= BATCH_WINDOW_MS)
  return batch.reduce((best, r) => (Number(r.n_behaviors ?? 0) > Number(best.n_behaviors ?? 0) ? r : best))
}

const num = (v: number | string | null | undefined): number | null =>
  v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v)

/** A row becomes a SearchSpace as long as the corpus and judged counts are there. The
 *  grid sizes may be absent: the copy then says what it knows and nothing more. */
export function toSearchSpace(row: SearchSpaceRow): SearchSpace | null {
  const nBehaviors = num(row.n_behaviors)
  const nJudged = num(row.n_judged)
  if (nBehaviors == null || nJudged == null) return null
  return {
    base: row.base,
    tf: row.tf,
    nParams: num(row.n_params),
    nFilterConfigs: num(row.n_filter_configs),
    nExits: num(row.n_exits),
    nBehaviors,
    nJudged,
  }
}

export async function getSearchSpace(
  base: string = WORKED_EXAMPLE.base,
  tf: string = WORKED_EXAMPLE.tf,
): Promise<SearchSpace | null> {
  try {
    const { supabaseServer } = await import('@/lib/supabase-server')
    const { data } = await supabaseServer
      .from('engine_search_space_public')
      .select('base, tf, n_params, n_filter_configs, n_exits, n_behaviors, n_judged, published_at')
      .eq('base', base)
      .eq('tf', tf)
      .order('published_at', { ascending: false })
      .limit(12)
    const row = pickCorpusRow((data ?? []) as SearchSpaceRow[])
    return row ? toSearchSpace(row) : null
  } catch {
    return null
  }
}

/** True when the publisher wrote the three grid sizes. */
export function hasGrid(s: SearchSpace): s is SearchSpace & { nParams: number; nFilterConfigs: number; nExits: number } {
  return s.nParams != null && s.nFilterConfigs != null && s.nExits != null
}

/** Re-exported from the repo's single number formatter rather than re-implemented.
 *  `count()` normalises the thousands separator to U+202F: toLocaleString alone returns
 *  U+202F or U+00A0 depending on the runtime's ICU data, and a previous per-component copy
 *  of this logic silently never matched. One place where a number becomes French. */
import { count } from '@/lib/screening'
export const fr = count

/** The product, phrased the way the copy phrases it. Derived rather than written, so it
 *  follows the grid instead of contradicting it after the next library change. */
export function variantsPhrase(s: SearchSpace): string {
  if (!hasGrid(s)) return 'des millions'
  const total = s.nParams * s.nFilterConfigs * s.nExits
  const millions = Math.floor(total / 1_000_000)
  return millions >= 1 ? `un peu plus de ${fr(millions)} millions` : `${fr(total)}`
}
