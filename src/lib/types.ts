// src/lib/types.ts
export type BotStatus = 'paper' | 'live' | 'backtest' | 'frozen'
export type TradeSide = 'long' | 'short'

export interface Bot {
  id: string
  slug: string
  name: string
  strategy: string
  status: BotStatus
  family: 'trend' | 'breakout' | 'mean-reversion' | 'carry' | null
  exchange: string
  assets: string[]
  timeframe: string
  description: string | null
  created_at: string
  last_sync_at: string | null
  start_capital: number
}

export interface Trade {
  id: string
  bot_id: string
  opened_at: string
  closed_at: string
  asset: string
  side: TradeSide
  pnl: number
  reason: string | null
  is_paper: boolean
}

export interface PerfDaily {
  id: string
  bot_id: string
  date: string
  capital: number
  pnl_day: number
  win_rate: number | null
  profit_factor: number | null
}

export interface BotStats {
  win_rate: number
  profit_factor: number
  max_drawdown: number
  total_trades: number
  latest_capital: number
}

export interface BotWithStats extends Bot {
  stats: BotStats
  perf_daily: PerfDaily[]
  recent_trades: Trade[]
  all_trades: Trade[]   // complete trade list, used for client-side long/short filtering
}

export interface WealthCall {
  id: string
  executed_at: string
  asset: string
  portfolio: 'wealth' | 'growth'
  amount_eur: number
  multiplier: number
  signal_level: 'none' | 'minor_dip' | 'major_dip' | 'crash'
  venue: string
  price_eur: number | null
  quantity: number | null
  created_at: string
}

export interface AssetPrice {
  asset: string
  price_eur: number
  source: string
  updated_at: string
}

export interface GrowthAlert {
  id: string
  alerted_at: string
  ticker: string
  asset_name: string
  drawdown_pct: number
  ma50_gap_pct: number | null
  rsi14: number | null
  signal_level: 'minor' | 'major' | 'crash'
  confidence: string | null
  market_regime: string | null
  mi_score: number | null
  mi_regime: string | null
  current_price: number | null
  high_90d: number | null
  suggested_min: number | null
  suggested_max: number | null
  indicators: string | null  // JSON array ["minor","none","major"]
  created_at: string
}

export interface MiSnapshot {
  id: string
  snapshot_at: string
  composite_score: number | null
  regime: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' | null
  sentiment_regime: 'EXTREME_FEAR' | 'FEAR' | 'NEUTRAL' | 'GREED' | 'EXTREME_GREED' | null
  is_safe: boolean | null
  is_macro_safe: boolean | null
  sentiment_score: number | null
  derivatives_score: number | null
  news_score: number | null
  macro_score: number | null
  institutional_score: number | null
  // Directional filter (added 2026-05-12)
  market_bias: 'LONG_ONLY' | 'SHORT_ONLY' | 'BOTH' | 'BLOCKED' | null
  trend_regime: 'BULL' | 'TRANSITION' | 'BEAR' | null
  btc_vs_ema200_pct: number | null
  allow_long: boolean | null
  allow_short: boolean | null
  created_at: string
}

export type TriggerData = {
  profitFactor: number
  totalTrades: number
  isLive: boolean
}

export interface Comment {
  id: string
  pseudo: string
  message: string
  created_at: string
}

export interface Badge {
  emoji: string
  label: string
  color: string
}

export interface TradeWithBot {
  id: string
  opened_at: string
  closed_at: string
  asset: string
  side: string
  pnl: number
  reason: string | null
  bots: { name: string; slug: string; family: string | null } | null
}

export interface GrowthAsset {
  ticker: string
  asset_name: string
  category: string | null
  tier: 1 | 2
  tracking_mode: string | null
  hold_forever: boolean | null
  dip_trigger_pct: number | null
  tp1_pct: number | null
  tp2_pct: number | null
  tp1_sell_pct: number | null
  tp2_sell_pct: number | null
  residual_pct: number | null
  current_price: number | null
  ref_price_180j: number | null
  drawdown_pct: number | null       // fraction: -0.25 = -25%
  signal_level: 'minor' | 'major' | 'crash' | null
  suggested_min: number | null
  suggested_max: number | null
  last_updated: string
}

export type Verdict = 'renforcer' | 'maintenir' | 'skip'

export interface EquityFiche {
  ticker: string
  ticker_yf: string
  asset_name: string
  category: string | null
  generated_at: string
  thesis_version: number
  price_at_generation: number | null
  fondamentaux: string
  valorisation: string
  momentum: string
  risques: string
  verdict: Verdict
  verdict_reason: string
  is_featured: boolean
}

export interface EquityMarketRow {
  signal_level: 'minor' | 'major' | 'crash' | null
  drawdown_pct: number | null
  ref_price_180j: number | null
  tp1_pct: number | null
  tp2_pct: number | null
  tp1_sell_pct: number | null
  tp2_sell_pct: number | null
  current_price: number | null
}

export type ChangelogCategory = 'asset' | 'fix' | 'strategy' | 'perf' | 'risk'

export interface BotChangelog {
  id: string
  created_at: string
  bot_slug: string
  entry_date: string        // 'YYYY-MM-DD'
  category: ChangelogCategory
  summary: string
  detail: string | null
  session_ref: string | null
}
