import { supabaseServer } from '@/lib/supabase-server'
import type { EquityFiche, EquityMarketRow, Verdict } from '@/lib/types'

export async function getLatestFiche(ticker: string): Promise<EquityFiche | null> {
  const { data, error } = await supabaseServer
    .from('equity_fiches')
    .select('*')
    .eq('ticker', ticker)
    .order('thesis_version', { ascending: false })
    .limit(1)
  if (error || !data || data.length === 0) return null
  return data[0] as EquityFiche
}

export async function getGrowthRow(ticker: string): Promise<EquityMarketRow | null> {
  const { data, error } = await supabaseServer
    .from('growth_universe')
    .select('signal_level,drawdown_pct,ref_price_180j,tp1_pct,tp2_pct,tp1_sell_pct,tp2_sell_pct,residual_pct,exit_state,current_price')
    .eq('ticker', ticker)
    .limit(1)
  if (error || !data || data.length === 0) return null
  return data[0] as EquityMarketRow
}

export type CoveredFiche = {
  ticker: string
  verdict: string
  generated_at: string
  price_at_generation: number | null
  ticker_yf: string
}

export async function getCoveredFiches(): Promise<CoveredFiche[]> {
  // latest row per ticker; price_at_generation + ticker_yf feed the live "% depuis l'analyse"
  const { data, error } = await supabaseServer
    .from('equity_fiches')
    .select('ticker,verdict,generated_at,thesis_version,price_at_generation,ticker_yf')
    .order('thesis_version', { ascending: false })
  if (error || !data) return []
  const seen = new Map<string, CoveredFiche>()
  for (const r of data as Array<CoveredFiche & { thesis_version: number }>) {
    if (!seen.has(r.ticker)) {
      seen.set(r.ticker, {
        ticker: r.ticker,
        verdict: r.verdict,
        generated_at: r.generated_at,
        price_at_generation: r.price_at_generation ?? null,
        ticker_yf: r.ticker_yf,
      })
    }
  }
  return [...seen.values()]
}

export type FicheIndexRow = {
  ticker: string
  asset_name: string
  category: string | null
  verdict: Verdict
  generated_at: string
  verdict_reason: string | null
  price_at_generation: number | null
  ticker_yf: string | null
}

export async function getAllFiches(): Promise<FicheIndexRow[]> {
  // latest thesis_version per ticker
  try {
    const { data, error } = await supabaseServer
      .from('equity_fiches')
      .select('ticker,asset_name,category,verdict,thesis_version,generated_at,verdict_reason,price_at_generation,ticker_yf')
      .order('thesis_version', { ascending: false })
    if (error || !data) return []
    const seen = new Map<string, FicheIndexRow>()
    for (const r of data as Array<FicheIndexRow & { thesis_version: number }>) {
      if (!seen.has(r.ticker)) {
        seen.set(r.ticker, {
          ticker: r.ticker, asset_name: r.asset_name, category: r.category, verdict: r.verdict,
          generated_at: r.generated_at, verdict_reason: r.verdict_reason ?? null,
          price_at_generation: r.price_at_generation ?? null, ticker_yf: r.ticker_yf ?? null,
        })
      }
    }
    return [...seen.values()]
  } catch {
    // build-time network error (Supabase unreachable) — degrade gracefully
    return []
  }
}

export async function getFichesByCategory(
  category: string, excludeTicker: string, limit = 3,
): Promise<FicheIndexRow[]> {
  const all = await getAllFiches()
  return all.filter(f => f.category === category && f.ticker !== excludeTicker).slice(0, limit)
}

export async function getFicheSitemapData(): Promise<{ ticker: string; generated_at: string }[]> {
  try {
    const { data, error } = await supabaseServer
      .from('equity_fiches')
      .select('ticker,generated_at,thesis_version')
      .order('thesis_version', { ascending: false })
    if (error || !data) return []
    const seen = new Map<string, string>()
    for (const r of data as Array<{ ticker: string; generated_at: string; thesis_version: number }>) {
      if (!seen.has(r.ticker)) seen.set(r.ticker, r.generated_at)
    }
    return [...seen.entries()].map(([ticker, generated_at]) => ({ ticker, generated_at }))
  } catch {
    return []
  }
}
