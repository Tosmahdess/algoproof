// src/lib/types.ts
export type BotStatus = 'paper' | 'live' | 'backtest' | 'frozen'
export type TradeSide = 'long' | 'short'

export interface Bot {
  id: string
  slug: string
  name: string
  strategy: string
  status: BotStatus
  family: 'trend' | 'breakout' | 'mean-reversion' | null
  exchange: string
  assets: string[]
  timeframe: string
  description: string | null
  created_at: string
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
  is_safe: boolean | null
  is_macro_safe: boolean | null
  sentiment_score: number | null
  derivatives_score: number | null
  news_score: number | null
  macro_score: number | null
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
