// src/lib/types.ts
export type BotStatus = 'paper' | 'live' | 'backtest' | 'frozen'
export type TradeSide = 'long' | 'short'

export interface Bot {
  id: string
  slug: string
  name: string
  strategy: string
  status: BotStatus
  family: 'trend' | 'breakout' | 'multi-signal' | 'multi-asset' | 'leveraged' | null
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
