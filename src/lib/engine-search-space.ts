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
  /** Size of the parameter grid swept for this base. */
  nParams: number
  /** Entry-filter combinations swept (bounded-K library). */
  nFilterConfigs: number
  /** Exit policies swept. */
  nExits: number
  /** DEDUPLICATED corpus: variants producing an identical trade sequence count once. */
  nBehaviors: number
  /** Top-K actually sent through the gauntlet. */
  nJudged: number
}

/** The unit the explainer uses as its one worked example. Deliberately a single named
 *  cell, not an average: the 9 bases have parameter grids from 6 to 66 entries, so any
 *  "the engine sweeps N variants" claim across all of them would be false for most. */
export const WORKED_EXAMPLE = { base: 'EMAcross', tf: 'D1' } as const

export async function getSearchSpace(
  base: string = WORKED_EXAMPLE.base,
  tf: string = WORKED_EXAMPLE.tf,
): Promise<SearchSpace | null> {
  try {
    const { supabaseServer } = await import('@/lib/supabase-server')
    const { data } = await supabaseServer
      .from('engine_search_space_public')
      .select('base, tf, n_params, n_filter_configs, n_exits, n_behaviors, n_judged')
      .eq('base', base)
      .eq('tf', tf)
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!data) return null
    // A row can exist with the counts still NULL: migration 030 adds the columns empty and
    // the engine publisher does not emit them yet, so only backfilled units carry them.
    // Half a sentence with a hole in it is worse than the sentence without figures.
    if (data.n_params == null || data.n_filter_configs == null || data.n_exits == null) return null
    return {
      base: data.base,
      tf: data.tf,
      nParams: Number(data.n_params),
      nFilterConfigs: Number(data.n_filter_configs),
      nExits: Number(data.n_exits),
      nBehaviors: Number(data.n_behaviors),
      nJudged: Number(data.n_judged),
    }
  } catch {
    return null
  }
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
  const total = s.nParams * s.nFilterConfigs * s.nExits
  const millions = Math.floor(total / 1_000_000)
  return millions >= 1 ? `un peu plus de ${fr(millions)} millions` : `${fr(total)}`
}
