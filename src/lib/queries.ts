// src/lib/queries.ts
import { supabase } from './supabase'
import { Bot, BotWithStats, PerfDaily, Trade, WealthCall, AssetPrice, MiSnapshot, TriggerData, BotChangelog } from './types'
import { getStartCapital } from './start-capitals'

function withStartCapital<T extends { slug: string }>(row: T): T & { start_capital: number } {
  return { ...row, start_capital: getStartCapital(row.slug) }
}

export async function getBots(): Promise<Bot[]> {
  const { data, error } = await supabase
    .from('bots')
    .select('id,slug,name,strategy,status,family,exchange,assets,timeframe,description,created_at,last_sync_at')
    .neq('status', 'frozen')
    .order('name')
  if (error) throw new Error(error.message)
  return (data ?? []).map(withStartCapital) as Bot[]
}

export async function getBotSlugs(): Promise<string[]> {
  const { data, error } = await supabase
    .from('bots')
    .select('slug')
    .neq('status', 'frozen')
  if (error) throw new Error(error.message)
  return (data ?? []).map(r => r.slug)
}

export async function getBotWithStats(slug: string): Promise<BotWithStats | null> {
  const { data: bot, error: botErr } = await supabase
    .from('bots')
    .select('*')
    .eq('slug', slug)
    .single()
  if (botErr || !bot) return null

  const { data: trades, error: tradesErr } = await supabase
    .from('trades')
    .select('*')
    .eq('bot_id', bot.id)
    .order('closed_at', { ascending: false })
  if (tradesErr) throw new Error(`trades fetch failed for bot ${bot.id}: ${tradesErr.message}`)

  const { data: perf, error: perfErr } = await supabase
    .from('perf_daily')
    .select('*')
    .eq('bot_id', bot.id)
    .order('date', { ascending: true })
  if (perfErr) throw new Error(`perf_daily fetch failed for bot ${bot.id}: ${perfErr.message}`)

  const allTrades: Trade[] = trades ?? []
  const allPerf: PerfDaily[] = perf ?? []
  const startCapital = getStartCapital(bot.slug)

  const wins = allTrades.filter(t => t.pnl > 0).length
  const win_rate = allTrades.length > 0 ? wins / allTrades.length : 0

  const grossProfit = allTrades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0)
  const grossLoss   = Math.abs(allTrades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0))
  const profit_factor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0

  const capitals = allPerf.map(p => p.capital)
  let peak = capitals[0] ?? 0
  let max_drawdown = 0
  for (const c of capitals) {
    if (c > peak) peak = c
    const dd = peak > 0 ? (peak - c) / peak : 0
    if (dd > max_drawdown) max_drawdown = dd
  }

  return {
    ...bot,
    start_capital: startCapital,
    stats: {
      win_rate,
      profit_factor,
      max_drawdown,
      total_trades: allTrades.length,
      latest_capital: capitals[capitals.length - 1] ?? startCapital,
    },
    perf_daily: allPerf,
    recent_trades: allTrades.slice(0, 20),
    all_trades: allTrades,
  }
}

export async function getAllBotsWithStats(): Promise<BotWithStats[]> {
  const bots = await getBots()
  return Promise.all(bots.map(async b => {
    const result = await getBotWithStats(b.slug)
    if (!result) throw new Error(`getBotWithStats returned null for slug: ${b.slug}`)
    return result
  }))
}

export async function getWealthCalls(): Promise<WealthCall[]> {
  const { data, error } = await supabase
    .from('wealth_calls')
    .select('*')
    .order('executed_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getAssetPrices(): Promise<AssetPrice[]> {
  const { data, error } = await supabase
    .from('asset_prices')
    .select('*')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getLatestMacroReport(): Promise<{
  date: string
  content: string
  score: number | null
  regime: string | null
  generated_at: string
} | null> {
  const { data, error } = await supabase
    .from('macro_reports')
    .select('date, content, score, regime, generated_at')
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return null
  return data
}

export async function getLatestMiSnapshot(): Promise<MiSnapshot | null> {
  const { data, error } = await supabase
    .from('mi_snapshots')
    .select('*')
    .order('snapshot_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return null
  return data
}

export async function getMiHistory(days = 7): Promise<MiSnapshot[]> {
  const since = new Date(Date.now() - days * 86400 * 1000).toISOString()
  const { data, error } = await supabase
    .from('mi_snapshots')
    .select('snapshot_at,composite_score,regime,sentiment_regime,sentiment_score,derivatives_score,news_score,macro_score,institutional_score,market_bias,trend_regime,btc_vs_ema200_pct')
    .gte('snapshot_at', since)
    .order('snapshot_at', { ascending: true })
  if (error) return []
  return (data ?? []) as unknown as MiSnapshot[]
}

export async function getTriggerData(slug: string): Promise<TriggerData | null> {
  const { data: bot, error: botErr } = await supabase
    .from('bots')
    .select('id, status')
    .eq('slug', slug)
    .single()
  if (botErr || !bot) return null

  const { data: trades, error: tradesErr } = await supabase
    .from('trades')
    .select('pnl')
    .eq('bot_id', bot.id)
    .eq('is_paper', false)
    .order('closed_at', { ascending: false })
  if (tradesErr) return null

  const all = trades ?? []
  if (all.length === 0) return { profitFactor: 0, totalTrades: 0, isLive: bot.status === 'live' }

  const grossProfit = all.filter((t: { pnl: number }) => t.pnl > 0).reduce((s: number, t: { pnl: number }) => s + t.pnl, 0)
  const grossLoss   = Math.abs(all.filter((t: { pnl: number }) => t.pnl < 0).reduce((s: number, t: { pnl: number }) => s + t.pnl, 0))
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0

  return { profitFactor, totalTrades: all.length, isLive: bot.status === 'live' }
}

export async function getChangelogForBot(slug: string): Promise<BotChangelog[]> {
  const { data, error } = await supabase
    .from('bot_changelogs')
    .select('id,created_at,bot_slug,entry_date,category,summary,detail,session_ref')
    .eq('bot_slug', slug)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) {
    console.error('[getChangelogForBot]', error.message)
    return []
  }
  return (data ?? []) as BotChangelog[]
}
