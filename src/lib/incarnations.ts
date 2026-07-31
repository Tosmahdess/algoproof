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
 * The 13 fiches with no alias entry are deliberately absent, not equally so —
 * see task-2-report.md (fix round 1) for the full evidence table:
 *
 * 1. No known deployed bot at all — zero incarnations is correct, indefinitely.
 *    No slug for any of these appears anywhere in `src/lib/bot-params.ts`'s
 *    37 real bot slugs.
 *      - supertrend
 *      - stochastic
 *      - fvg
 *
 * 2. Known deployed bot, title carries a parenthetical or suffix — the exact
 *    failure mode this comment names above for ORB. These are the most likely
 *    to be silently and permanently broken by the title fallback; verify
 *    these first once the real `bots.strategy` value is available.
 *      - roc         → title "ROC (Rate of Change)"      → bot roc-bf12
 *      - tsi         → title "TSI (True Strength Index)" → bot tsi-bf8
 *      - heikin-ashi → title "Heikin Ashi Trend"          → bot hatrend-bf28
 *
 * 3. Known deployed bot, title has no obvious parenthetical/suffix — lower
 *    risk than group 2, but still unverified against a real `bots.strategy`
 *    string.
 *      - ma-cross        → title "MA Cross"       → bot macsimple-bf10
 *      - ema-ribbon      → title "EMA Ribbon"      → bot emaribbon-bf17
 *      - chandelier-exit → title "Chandelier Exit" → bot chandelier-bf14
 *      - keltner         → title "Keltner Channel" → bot keltner-hlperps-xau
 *      - bollinger       → title "Bollinger Bands" → bot bbsqueeze-bf10
 *      - ttm-squeeze     → title "TTM Squeeze"      → bot ttmsqueeze-bf7
 *      - rsi-divergence  → title "RSI Divergence"   → bot rsidivergence-bf6
 *
 * Groups 2 and 3 both have a real bot behind them — the gap is a missing
 * string, not a missing bot. An absent pairing renders as zero incarnations,
 * which is visible and correctable; a guessed one would not be.
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
