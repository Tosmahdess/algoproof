// tests/fixtures/bots.ts
// One place that knows the full shape of a BotWithStats. Every list/filter test
// builds from mkBot so that adding a field to Bot breaks one file, not forty.
//
// The `strategy` values here are VERBATIM production strings (see
// PROD_STRATEGY below), not plausible-looking inventions. The previous fixture
// used short names — 'EMA Cross', 'ORB', 'MACD' — that no bot has ever carried,
// and that fiction is exactly what let a join on `bots.strategy` pass its tests
// while matching nothing at all in production.
//
// FIXTURE_FLEET is deliberately adversarial: it covers all nine families, a bot
// per status, a dormant bot with zero trades, a low-sample bot, a bot with a null
// venue (unmapped exchange), an engine-born bot and a hand-deployed one.
// Caveat on `family`: production only carries five of the nine (trend, breakout,
// carry, market-neutral, mean-reversion), so four bots below are filed under a
// family they do not have in production, purely to keep every facet of the
// filter bar covered. Their `slug` and `strategy` are still the real ones —
// those are the fields the join and the register read.
import type { BotWithStats } from '@/lib/types'

/**
 * `bots.strategy`, verbatim, for the deployed bots these fixtures model.
 *
 * Source: the VPS sync that writes the column
 * (projects/algoproof/scripts/algoproof_sync.py in the vault, `BOTS[].strategy`).
 * Five of these were quoted independently in the task brief and match character
 * for character — em dash, "±8%", "actifs" — which is what makes the rest of the
 * table trustworthy rather than merely plausible.
 *
 * A test that needs a bot fixture should go through `prodBot`, which refuses a
 * slug that is not in here. That is the mechanism that keeps invented strategy
 * strings out of the suite.
 */
export const PROD_STRATEGY: Record<string, string> = {
  'breakout-hl-sol': 'Asia Session Breakout M5 — SOL',
  'atrchannel-bf26': 'ATR Channel H4 — 26 actifs',
  'combobbrsi-bf9': 'BB + RSI H4 — 9 actifs',
  'bbsqueeze-bf10': 'BB Squeeze H4 — 10 actifs',
  'funding-rate-harvest': 'Delta-neutral carry — Long spot + Short perp HL',
  'donchian-bf17': 'Donchian H4 — 17 actifs',
  'emacross-bf7-x10': 'EMA 21/100 H4 — 7 actifs — Levier ×10',
  'emacross-9-bf9': 'EMA 9/50 H4 — 9 actifs',
  'emacross-eur-usd': 'EMA 9/50 H4 — EUR/USD',
  'v1-spot': 'EMA Cross H4 (21/55/200)',
  'v1-hl': 'EMA Cross H4 (21/55/200) — Hyperliquid Perps',
  'v1-spot-shadow': 'EMA Cross H4 (21/55/200) — Spot Binance, défense relâchée',
  'bspot-ema-h4-slh1': 'EMA Cross H4 + SL H1 ATR — SOL/LINK/DOGE',
  'emacross-slope-bf6': 'EMA Cross H4 + Slope EMA55 — 6 actifs BF',
  'emaribbon-bf17': 'EMA Ribbon H4 — 17 actifs',
  'grid-btc-spot': 'Grille arithmétique ±8% — BTC/USDT Binance Spot',
  'hatrend-bf28': 'HeikinAshi H4 — 28 actifs',
  'hmacross-bf22': 'HMA H4 — 22 actifs',
  'ichimoku-bf25': 'Ichimoku H4 — 25 actifs',
  'keltner-xau-hl': 'Keltner H4 — XAU-USDC',
  'macdvolume-bf11': 'MACD + Volume H4 — 11 actifs',
  'orb-bf25': 'Opening Range H1 — 25 actifs',
  'funding-rev-long':
    'Reversal contrarian sur extrême de funding + capitulation — long-only, gross 0.35',
  'temacross-bf10': 'TEMA 20/100 H4 — 10 actifs',
  'tsi-bf8': 'True Strength Index H4 — 8 actifs',
  'ttmsqueeze-bf7': 'TTM Squeeze H4 — 7 actifs',
  'wvolbreak-bf28': 'Williams Vol Break D1 — 28 actifs',
  // Not among the 27 currently deployed, but present in the same sync config —
  // i.e. what a bot the sync has since archived looks like.
  'chandelier-bf14': 'Chandelier Exit H4 — 14 actifs',
  'hlperps-xsec-degross':
    'Momentum cross-sectionnel L/S — dollar-neutral, gross 0.35, sans stop',
}

/**
 * An engine-promoted bot's `strategy` sentence is written by the orchestrator,
 * not by the sync's hand-written config, and I have no verbatim example of one.
 * Rather than invent a plausible sentence — the mistake this whole fixture is
 * being rewritten to undo — engine fixtures carry this marker. Nothing asserts
 * on it, and nothing can: an engine bot joins through `engine_unit_key`, which
 * is precisely the property the tests exercise.
 */
const NOT_A_PRODUCTION_STRING = (what: string) =>
  `NOT-A-PRODUCTION-STRING (engine-born ${what}; joins via engine_unit_key)`

let seq = 0

export function mkBot(over: Partial<BotWithStats> = {}): BotWithStats {
  seq += 1
  const base: BotWithStats = {
    id: `id-${seq}`,
    slug: `bot-${seq}`,
    name: `Bot ${seq}`,
    strategy: PROD_STRATEGY['v1-spot'],
    status: 'paper',
    family: 'trend',
    exchange: 'Binance Spot',
    venue: 'binance-spot',
    assets: ['BTC'],
    timeframe: 'H4',
    description: null,
    created_at: '2026-01-01T00:00:00Z',
    last_sync_at: '2026-07-31T00:00:00Z',
    start_capital: 1000,
    origin: 'manual',
    found_at: null,
    validated_at: null,
    paper_since: '2026-01-01T00:00:00Z',
    live_since: null,
    frozen_at: null,
    archived_at: null,
    engine_unit_key: null,
    rejudge_status: 'queued',
    stats: {
      win_rate: 0.5,
      profit_factor: 1.4,
      max_drawdown: 0.08,
      total_trades: 60,
      latest_capital: 1120,
    },
    perf_daily: [],
    recent_trades: [],
    all_trades: [],
  }
  return { ...base, ...over, stats: { ...base.stats, ...(over.stats ?? {}) } }
}

/**
 * A bot fixture for a REAL deployed bot: real slug, real `strategy` sentence.
 * Throws on an unknown slug rather than making one up, so a test cannot quietly
 * reintroduce a strategy string that production has never contained.
 *
 * `slug` and `strategy` are not overridable: the whole point of `prodBot` is
 * that both come from the verified table. Overriding `slug` would silently
 * change which fiche the fixture resolves to while still reading as a test of
 * the bot named in the call; overriding `strategy` would let an invented
 * sentence back in through the one door built to keep it out. A test that
 * needs either to vary uses `mkBot` instead.
 */
export function prodBot(slug: string, over: Partial<BotWithStats> = {}): BotWithStats {
  const strategy = PROD_STRATEGY[slug]
  if (!strategy) {
    throw new Error(
      `No production strategy string known for bot slug "${slug}". Add it to ` +
        `PROD_STRATEGY from the VPS sync config, or use mkBot() for a bot that ` +
        `does not model a real deployment.`,
    )
  }
  if ('strategy' in over || 'slug' in over) {
    throw new Error(
      `prodBot("${slug}"): cannot override slug or strategy — use mkBot() if you need a synthetic bot`,
    )
  }
  return mkBot({ ...over, slug, strategy })
}

export const FIXTURE_FLEET: BotWithStats[] = [
  prodBot('v1-spot', { name: 'EMA Cross H4 Kraken Spot',
          status: 'live', family: 'trend', venue: 'kraken', exchange: 'Kraken Spot',
          timeframe: 'H4', assets: ['BTC'], live_since: '2026-05-08T00:00:00Z',
          stats: { total_trades: 13, win_rate: 0.46, profit_factor: 2.0, max_drawdown: 0.05, latest_capital: 1080 } }),
  prodBot('orb-bf25', { name: 'ORB H1 HL',
          status: 'live', family: 'breakout', venue: 'hyperliquid', exchange: 'Hyperliquid',
          timeframe: 'H1', assets: ['SOL'], live_since: '2026-04-26T00:00:00Z',
          stats: { total_trades: 86, win_rate: 0.41, profit_factor: 0.95, max_drawdown: 0.14, latest_capital: 940 } }),
  prodBot('macdvolume-bf11', { name: 'MACD Volume H4 BF', family: 'momentum', timeframe: 'H1',
          venue: 'binance-futures', exchange: 'Binance Futures', assets: ['ETH'] }),
  prodBot('wvolbreak-bf28', { name: 'Williams Vol Break D1 BF', family: 'price-action',
          timeframe: 'M15', venue: 'hyperliquid', assets: ['BTC'] }),
  prodBot('combobbrsi-bf9', { name: 'Combo BB+RSI H4 BF', family: 'mean-reversion',
          timeframe: 'H4', venue: 'bybit', assets: ['ETH'] }),
  // cross-venue: delta-neutral carry, long spot on Binance, short perp on
  // Hyperliquid — one bot, two venues. `exchange` is the real production
  // string; a `%hyperliquid%` or `%binance%` `like` match on it alone
  // classifies this wrong (see migrations/018_bots_venue.sql).
  prodBot('funding-rate-harvest', { name: 'Funding Rate Harvesting', family: 'carry',
          timeframe: 'H8', venue: 'cross-venue', exchange: 'HL Perps + Binance Spot',
          assets: ['BTC'], start_capital: 400 }),
  // oanda: the one forex bot in production, no crypto exchange involved at all.
  prodBot('emacross-eur-usd', { name: 'EMA Cross H4 EUR/USD', family: 'trend',
          timeframe: 'H4', venue: 'oanda', exchange: 'OANDA', assets: ['EUR/USD'] }),
  prodBot('hlperps-xsec-degross', { name: 'Momentum Cross-Sectionnel D1', family: 'market-neutral',
          timeframe: 'D1', venue: 'hyperliquid', assets: ['BTC', 'ETH', 'SOL'] }),
  prodBot('funding-rev-long', { name: 'Funding-Reversal D1 Long-only', family: 'stat-arb',
          timeframe: 'H4', venue: 'binance-spot', assets: ['ETH'] }),
  // No fiche claims a grid bot — it must still be listed, under its own wording.
  prodBot('grid-btc-spot', { name: 'Grid BTC Spot', family: 'event', timeframe: 'D1',
          venue: 'okx', assets: ['SOL'] }),
  // dormant: deployed, running, has never traded. Must still be listed (spec §6.5).
  prodBot('ichimoku-bf25', { name: 'Ichimoku H4 BF', family: 'trend', timeframe: 'H4',
          venue: 'binance-spot', assets: ['BTC'],
          stats: { total_trades: 0, win_rate: 0, profit_factor: 0, max_drawdown: 0, latest_capital: 1000 } }),
  // low sample: has trades, but under the 20-trade threshold
  prodBot('emaribbon-bf17', { name: 'EMA Ribbon H4 BF', family: 'trend', timeframe: 'H1',
          venue: 'binance-spot', assets: ['ETH'],
          stats: { total_trades: 7, win_rate: 0.57, profit_factor: 3.1, max_drawdown: 0.02, latest_capital: 1050 } }),
  // engine-born: absent from the legacy slug map on purpose — it must resolve
  // through engine_unit_key alone.
  mkBot({ slug: 'atrchannel-k3', name: 'ATR Channel K3 (engine)',
          strategy: NOT_A_PRODUCTION_STRING('ATRChannel'),
          family: 'breakout', timeframe: 'H4',
          venue: 'hyperliquid', assets: ['BTC'], origin: 'engine',
          found_at: '2026-07-12T00:00:00Z', validated_at: '2026-07-15T00:00:00Z',
          paper_since: '2026-07-18T00:00:00Z', rejudge_status: 'not_needed',
          engine_unit_key: 'ATRChannel|H4|data_20260701|3' }),
  // unmapped venue: a new exchange the sync has not learned yet
  prodBot('donchian-bf17', { name: 'Donchian Break H4 BF', family: 'breakout', timeframe: 'H4',
          venue: null, exchange: 'Some New Exchange', assets: ['BTC'] }),
  // archived: still listed, collapsed by default
  prodBot('chandelier-bf14', { name: 'Chandelier Exit H4 BF', family: 'trend', timeframe: 'D1',
          venue: 'binance-futures', assets: ['BTC'], status: 'archived',
          archived_at: '2026-06-01T00:00:00Z' }),
  // backtest candidate: found by the engine, never deployed. Must NEVER appear
  // on the public fleet, under any filter state — it has no paper_since.
  mkBot({ slug: 'candidate-never-deployed', name: 'Candidate (not deployed) — Wavelet Cross',
          strategy: NOT_A_PRODUCTION_STRING('WaveletCross'),
          family: 'momentum', timeframe: 'H1',
          venue: 'hyperliquid', assets: ['ETH'], status: 'backtest', origin: 'engine',
          found_at: '2026-07-29T00:00:00Z', validated_at: null, paper_since: null,
          engine_unit_key: 'WaveletCross|H1|data_20260701|4', rejudge_status: 'not_needed' }),
]

/** The eight deployed EMA Cross incarnations, by real slug. The headline case. */
export const EMA_CROSS_SLUGS = [
  'emacross-bf7-x10',
  'emacross-9-bf9',
  'emacross-eur-usd',
  'v1-spot',
  'v1-hl',
  'v1-spot-shadow',
  'bspot-ema-h4-slh1',
  'emacross-slope-bf6',
] as const
