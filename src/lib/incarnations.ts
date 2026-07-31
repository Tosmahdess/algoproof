// src/lib/incarnations.ts
// A concept page asks the fleet which bots run it, rather than the fiche naming
// its bot by hand.
//
// The lab's STRATEGY_REGISTRY did the hand-written version: one entry per fiche
// carrying a single botSlug, which was already wrong the moment a strategy had
// two incarnations. With the engine about to promote bots in bulk, a hand-written
// link would need an edit per promotion — so it is derived.
//
// Matching is exact on the normalised strategy name, never a substring: "ORB"
// must not swallow "ORB Reversal".
import type { StrategyFiche } from './strategy-library'

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/**
 * `bots.strategy` strings that count as a given fiche, keyed by fiche slug.
 *
 * Matching on fiche.title does NOT work in general and must not be relied on:
 * the library titles are display strings ("ORB (Opening Range Breakout)")
 * while the fleet carries operator strings ("ORB"). A title-only match returns
 * zero incarnations on the ORB page, which looks exactly like a design
 * decision rather than a bug. `incarnationsOf` still checks the title as a
 * fallback (harmless when it happens to match, e.g. "MACD" === "MACD"), but
 * every fiche below is listed explicitly so the pairing is visible in review
 * rather than relying on that fallback silently working or silently failing.
 *
 * This worktree cannot query Supabase (migrations unapplied, no credentials —
 * see Plan 3 Task 2 brief). Every line below is backed by a real string found
 * in this repo, not a guess:
 *  - tests/fixtures/bots.ts (FIXTURE_FLEET + mkBot default), which
 *    fleet-grouping.ts documents as "the `strategy` string, which every bot
 *    already carries" — i.e. deliberately representative of production shape.
 *  - tests/components/BotCard.test.tsx, which fixtures a second real bot
 *    slug (v1-spot) with a variant string.
 * Fiches with no such evidence (ma-cross, ema-ribbon, supertrend, heikin-ashi,
 * chandelier-exit, keltner, bollinger, ttm-squeeze, roc, tsi, rsi-divergence,
 * stochastic, fvg) are deliberately absent — see task-2-report.md for the full
 * evidence table. An absent pairing renders as zero incarnations, which is
 * visible and correctable; a guessed one would not be.
 */
const ALIASES: Record<string, string[]> = {
  'ema-cross': ['EMA Cross', 'EMA Cross H4'],
  orb: ['ORB'],
  macd: ['MACD'],
  'fvg-multi': ['FVG Multi'],
  'rsi-mean-reversion': ['RSI Mean Reversion'],
  ichimoku: ['Ichimoku'],
  'kama-cross': ['KAMA Cross'],
  'atr-channel': ['ATR Channel'],
  donchian: ['Donchian'],
}

export function incarnationsOf<T extends { strategy: string }>(
  fiche: StrategyFiche,
  bots: T[],
): T[] {
  const accepted = new Set(
    [...(ALIASES[fiche.slug] ?? []), fiche.title].map(norm),
  )
  return bots.filter(b => accepted.has(norm(b.strategy)))
}
