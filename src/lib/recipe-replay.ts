// src/lib/recipe-replay.ts
// What the replay on the repaired execution contract gives for a wave-1 bot's
// own recipe. The data is a generated, git-versioned artefact
// (scripts/gen_recipe_replay.py) — same static pattern as bot-expectations.ts:
// every change is dated and auditable.
//
// It is a replay, not a verdict: the random-control test was not re-run, and
// the hard gates are deliberately absent (user decision 2026-09-18 — these
// recipes will be judged again by the corrected engine).
import type { Bot } from './types'
import data from '@/data/recipe-replay.json'

export interface RecipeReplayRow {
  readonly slug: string
  readonly base: string
  readonly tf: string
  readonly pf: number
  readonly n: number
}

export interface RecipeReplayMeta {
  readonly source: string
  readonly reading: string
  readonly replayedOn: string
  readonly validUntil: string
  readonly dataset: string
  readonly dataThrough: string
  readonly universeAssets: number
  readonly engineFingerprint: string
  readonly recipesEngineFingerprint: string
  readonly vaultBaseCommit: string
  readonly csvSha256: string
}

export const RECIPE_REPLAY: { readonly meta: RecipeReplayMeta; readonly rows: readonly RecipeReplayRow[] } = data

const BY_SLUG = new Map(RECIPE_REPLAY.rows.map(r => [r.slug, r]))

export type RecipeReplayView =
  | {
      state: 'replayed'
      pf: number
      n: number
      replayedOn: string
      dataThrough: string
      universeAssets: number
      engineFingerprint: string
    }
  | { state: 'pending' }

/**
 * Null for any bot the engine did not select (same gate as dossierHref:
 * engine origin AND a unit key), so a hand-deployed bot never reads
 * « pas encore rejoué ».
 */
export function recipeReplayFor(
  bot: Pick<Bot, 'slug' | 'origin' | 'engine_unit_key'>,
): RecipeReplayView | null {
  if (bot.origin !== 'engine' || !bot.engine_unit_key) return null
  const row = BY_SLUG.get(bot.slug)
  if (!row) return { state: 'pending' }
  return {
    state: 'replayed',
    pf: row.pf,
    n: row.n,
    replayedOn: RECIPE_REPLAY.meta.replayedOn,
    dataThrough: RECIPE_REPLAY.meta.dataThrough,
    universeAssets: RECIPE_REPLAY.meta.universeAssets,
    engineFingerprint: RECIPE_REPLAY.meta.engineFingerprint,
  }
}
