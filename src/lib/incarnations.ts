// src/lib/incarnations.ts
// A concept page asks the fleet which bots run it, rather than the fiche naming
// its bot by hand.
//
// The lab's STRATEGY_REGISTRY did the hand-written version: one entry per fiche
// carrying a single botSlug, which was already wrong the moment a strategy had
// two incarnations. With the engine promoting bots in bulk, a hand-written link
// would need an edit per promotion — so it is derived.
//
// It is derived from the JOIN KEY, not from the strategy name. This file used to
// match `bots.strategy` against a table of aliases plus the fiche title, with a
// long comment ranking which of the 13 alias-less fiches were most at risk. All
// of it was compensation for the wrong key: production `strategy` values are
// per-deployment display sentences ("Donchian H4 — 17 actifs"), so not one of
// the 27 deployed bots ever matched, and the aliases could not have fixed that
// — see src/lib/strategy-keys.ts, which now owns the join.
import type { StrategyFiche } from './strategy-library'
import { ficheSlugForBot } from './strategy-keys'

/** Every bot the fiche's strategy is deployed as. Order follows the input. */
export function incarnationsOf<T extends { slug: string; engine_unit_key: string | null }>(
  fiche: StrategyFiche,
  bots: T[],
): T[] {
  return bots.filter(b => ficheSlugForBot(b) === fiche.slug)
}
