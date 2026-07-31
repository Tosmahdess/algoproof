// tests/fixtures/bots.ts
// One place that knows the full shape of a BotWithStats. Every list/filter test
// builds from mkBot so that adding a field to Bot breaks one file, not forty.
//
// FIXTURE_FLEET is deliberately adversarial: it covers all nine families, a bot
// per status, a dormant bot with zero trades, a low-sample bot, a bot with a null
// venue (unmapped exchange), an engine-born bot and a hand-deployed one.
import type { BotWithStats } from '@/lib/types'

let seq = 0

export function mkBot(over: Partial<BotWithStats> = {}): BotWithStats {
  seq += 1
  const base: BotWithStats = {
    id: `id-${seq}`,
    slug: `bot-${seq}`,
    name: `Bot ${seq}`,
    strategy: 'EMA Cross',
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

export const FIXTURE_FLEET: BotWithStats[] = [
  mkBot({ slug: 'v1-spot', name: 'EMA Cross H4 Kraken', strategy: 'EMA Cross',
          status: 'live', family: 'trend', venue: 'kraken', exchange: 'Kraken Spot',
          timeframe: 'H4', assets: ['BTC'], live_since: '2026-05-08T00:00:00Z',
          stats: { total_trades: 13, win_rate: 0.46, profit_factor: 2.0, max_drawdown: 0.05, latest_capital: 1080 } }),
  mkBot({ slug: 'orb-bf25', name: 'ORB H1 HL', strategy: 'ORB',
          status: 'live', family: 'breakout', venue: 'hyperliquid', exchange: 'Hyperliquid',
          timeframe: 'H1', assets: ['SOL'], live_since: '2026-04-26T00:00:00Z',
          stats: { total_trades: 86, win_rate: 0.41, profit_factor: 0.95, max_drawdown: 0.14, latest_capital: 940 } }),
  mkBot({ slug: 'macd-vol', strategy: 'MACD', family: 'momentum', timeframe: 'H1',
          venue: 'binance-futures', exchange: 'Binance Futures', assets: ['ETH'] }),
  mkBot({ slug: 'fvg-multi', strategy: 'FVG Multi', family: 'price-action', timeframe: 'M15',
          venue: 'hyperliquid', assets: ['BTC'] }),
  mkBot({ slug: 'rsi-mr', strategy: 'RSI Mean Reversion', family: 'mean-reversion',
          timeframe: 'H4', venue: 'bybit', assets: ['ETH'] }),
  mkBot({ slug: 'funding-harvest', strategy: 'Funding Harvest', family: 'carry',
          timeframe: 'H8', venue: 'hyperliquid', assets: ['BTC'], start_capital: 400 }),
  mkBot({ slug: 'xsec-degross', strategy: 'Cross-sectional', family: 'market-neutral',
          timeframe: 'D1', venue: 'hyperliquid', assets: ['BTC', 'ETH', 'SOL'] }),
  mkBot({ slug: 'pairs-eth-btc', strategy: 'Pairs', family: 'stat-arb', timeframe: 'H4',
          venue: 'binance-spot', assets: ['ETH'] }),
  mkBot({ slug: 'unlock-event', strategy: 'Token Unlock', family: 'event', timeframe: 'D1',
          venue: 'okx', assets: ['SOL'] }),
  // dormant: deployed, running, has never traded. Must still be listed (spec §6.5).
  mkBot({ slug: 'ichimoku-dormant', strategy: 'Ichimoku', family: 'trend', timeframe: 'H4',
          venue: 'binance-spot', assets: ['BTC'],
          stats: { total_trades: 0, win_rate: 0, profit_factor: 0, max_drawdown: 0, latest_capital: 1000 } }),
  // low sample: has trades, but under the 20-trade threshold
  mkBot({ slug: 'kama-fresh', strategy: 'KAMA Cross', family: 'trend', timeframe: 'H1',
          venue: 'binance-spot', assets: ['ETH'],
          stats: { total_trades: 7, win_rate: 0.57, profit_factor: 3.1, max_drawdown: 0.02, latest_capital: 1050 } }),
  // engine-born
  mkBot({ slug: 'atrchannel-k3', strategy: 'ATR Channel', family: 'breakout', timeframe: 'H4',
          venue: 'hyperliquid', assets: ['BTC'], origin: 'engine',
          found_at: '2026-07-12T00:00:00Z', validated_at: '2026-07-15T00:00:00Z',
          paper_since: '2026-07-18T00:00:00Z', rejudge_status: 'not_needed',
          engine_unit_key: 'ATRChannel|H4|data_20260701|3' }),
  // unmapped venue: a new exchange the sync has not learned yet
  mkBot({ slug: 'new-venue-bot', strategy: 'Donchian', family: 'breakout', timeframe: 'H4',
          venue: null, exchange: 'Some New Exchange', assets: ['BTC'] }),
  // archived: still listed, collapsed by default
  mkBot({ slug: 'tsmom-retired', strategy: 'TSMOM', family: 'trend', timeframe: 'D1',
          venue: 'binance-futures', assets: ['BTC'], status: 'archived',
          archived_at: '2026-06-01T00:00:00Z' }),
  // backtest candidate: found by the engine, never deployed. Must NEVER appear
  // on the public fleet, under any filter state — it has no paper_since.
  mkBot({ slug: 'candidate-never-deployed', name: 'Candidate (not deployed) — Wavelet Cross',
          strategy: 'Wavelet Cross', family: 'momentum', timeframe: 'H1',
          venue: 'hyperliquid', assets: ['ETH'], status: 'backtest', origin: 'engine',
          found_at: '2026-07-29T00:00:00Z', validated_at: null, paper_since: null,
          engine_unit_key: 'WaveletCross|H1|data_20260701|4', rejudge_status: 'not_needed' }),
]
