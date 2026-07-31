// src/lib/strategy-keys.ts
// The join key between a fleet bot and a strategy fiche.
//
// It is NOT `bots.strategy`. Production data settled that: `bots.strategy` is a
// per-deployment display sentence that embeds the timeframe and the asset count,
// and all 27 deployed bots carry a distinct value —
//
//     "True Strength Index H4 — 8 actifs"
//     "TTM Squeeze H4 — 7 actifs"
//     "EMA Cross H4 (21/55/200) — Hyperliquid Perps"
//     "Grille arithmétique ±8% — BTC/USDT Binance Spot"
//
// — so joining a fiche to bots on that string matched nothing at all (22 concept
// pages reading « aucun bot ne fait tourner cette stratégie ») and grouping the
// register on it produced 27 groups of one bot. Both failures were silent: no
// error, no red test. EMA Cross genuinely has eight deployed incarnations; they
// were simply invisible through `strategy`.
//
// No database column was added for this. « Fiche » is site-side editorial
// vocabulary; making the VPS sync emit it would push showcase concepts into the
// trading infrastructure. The join lives here instead, as two explicit maps.
import type { FicheSlug } from './strategy-library'

/**
 * Map A — legacy, hand-deployed bots, keyed by bot slug.
 *
 * This set is FROZEN: no bot will ever again be deployed by hand, so this map
 * does not grow. Anything promoted from now on is engine-born and resolves
 * through Map B below.
 *
 * One line per bot on purpose: a wrong pairing has to be visible in review, and
 * a fiche slug typo fails `tsc` because the values are `FicheSlug | null`.
 * `null` means « this bot runs something no fiche describes » — which is a real
 * and permanent answer, not a gap waiting to be filled.
 */
export const FICHE_BY_LEGACY_BOT_SLUG: Record<string, FicheSlug | null> = {
  'breakout-hl-sol': null,            // Asia session breakout, no fiche
  'atrchannel-bf26': 'atr-channel',
  'combobbrsi-bf9': null,             // BB+RSI combo, no single fiche
  'bbsqueeze-bf10': 'bollinger',
  'funding-rate-harvest': null,       // delta-neutral carry, no fiche
  'donchian-bf17': 'donchian',
  'emacross-bf7-x10': 'ema-cross',
  'emacross-9-bf9': 'ema-cross',
  'emacross-eur-usd': 'ema-cross',
  'v1-spot': 'ema-cross',
  'v1-hl': 'ema-cross',
  'v1-spot-shadow': 'ema-cross',
  'bspot-ema-h4-slh1': 'ema-cross',
  'emacross-slope-bf6': 'ema-cross',
  'emaribbon-bf17': 'ema-ribbon',
  'grid-btc-spot': null,              // grid, no fiche
  'hatrend-bf28': 'heikin-ashi',
  'hmacross-bf22': 'ma-cross',        // Hull MA cross — user's call
  'ichimoku-bf25': 'ichimoku',
  'keltner-xau-hl': 'keltner',
  'macdvolume-bf11': 'macd',
  'orb-bf25': 'orb',
  'funding-rev-long': null,           // funding reversal, no fiche
  'temacross-bf10': 'ma-cross',       // TEMA cross — user's call
  'tsi-bf8': 'tsi',
  'ttmsqueeze-bf7': 'ttm-squeeze',
  'wvolbreak-bf28': null,             // Williams vol break, no fiche
}

/**
 * Map B — engine-born bots, keyed by the engine base.
 *
 * A bot promoted by the config-search carries
 * `engine_unit_key = "base|tf|dataset_version|kmax"`, and `base` IS the strategy
 * identifier: `EMAcross`, `ATRChannel`, … It is stable across timeframes,
 * dataset versions and K, which is exactly what a join key should be.
 *
 * Seeded with the one base that is evidenced rather than guessed: the lab's own
 * `SCREENING_BASE_BY_STRATEGY_ID` (web/lib/strategy-incarnations.ts) maps
 * `ema_cross → "EMAcross"`. Nothing else is listed, deliberately — a guessed
 * base would silently claim bots for the wrong concept page, which is the class
 * of bug this module exists to end.
 *
 * TO ADD A BASE (the whole procedure):
 *   1. Take a bot the engine has promoted and read its `engine_unit_key`.
 *   2. Split on `|` and take the FIRST segment — that is the base, verbatim,
 *      case included. Do not normalise it, do not infer it from the bot's name
 *      or from its `strategy` sentence.
 *   3. Add one line here: `'<base>': '<fiche-slug>',`. `tsc` rejects a fiche
 *      slug that does not exist.
 * A base that is not listed simply resolves to null (or falls through to Map A):
 * the concept page shows no incarnation, which is visible and correctable.
 */
export const FICHE_BY_ENGINE_BASE: Record<string, FicheSlug> = {
  EMAcross: 'ema-cross',
}

/** The `base` segment of an `engine_unit_key`, or null when there isn't one. */
function engineBase(engineUnitKey: string | null): string | null {
  if (!engineUnitKey) return null
  const base = engineUnitKey.split('|')[0]?.trim()
  return base ? base : null
}

/**
 * Which fiche, if any, a bot's strategy belongs to.
 *
 * Engine key first. For anything the engine promoted, `engine_unit_key` is the
 * authoritative statement of which strategy the bot runs — it is the identity
 * the search ran under, written by the machine that made the decision, whereas
 * the slug is a name a human chose afterwards. A bot could conceivably appear in
 * both maps (a legacy slug reused for an engine promotion); the engine wins,
 * because the frozen hand-written map is the one that can go stale.
 *
 * Then Map A, for the 27 bots deployed before the engine existed. Then null —
 * both for a bot running a strategy no fiche describes, and for an engine base
 * nobody has evidenced yet. Null is rendered as « no concept page for this one »,
 * never as an error.
 */
export function ficheSlugForBot(
  bot: { slug: string; engine_unit_key: string | null },
): FicheSlug | null {
  const base = engineBase(bot.engine_unit_key)
  if (base !== null) {
    const fromEngine = FICHE_BY_ENGINE_BASE[base]
    if (fromEngine !== undefined) return fromEngine
  }
  return FICHE_BY_LEGACY_BOT_SLUG[bot.slug] ?? null
}
