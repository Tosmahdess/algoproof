import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

const LEVEL_RANK: Record<string, number> = { crash: 3, major: 2, minor: 1 }

// Returns current state per asset: one row per ticker (most recent / highest level)
// sorted by conviction desc then drawdown asc — cache 5 min
export async function GET() {
  const { data, error } = await supabaseServer
    .from('growth_alerts')
    .select('id,alerted_at,ticker,asset_name,drawdown_pct,signal_level,mi_regime,mi_score,current_price,high_90d,suggested_min,suggested_max')
    .order('alerted_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json([], { status: 200 })

  // Deduplicate: one row per ticker — keep highest level, tie-break by most recent
  const byTicker = new Map<string, typeof data[number]>()
  for (const a of data ?? []) {
    const existing = byTicker.get(a.ticker)
    if (!existing) { byTicker.set(a.ticker, a); continue }
    const newRank  = LEVEL_RANK[a.signal_level]      ?? 0
    const existRank = LEVEL_RANK[existing.signal_level] ?? 0
    if (newRank > existRank) byTicker.set(a.ticker, a)
    // same rank → keep existing (more recent, already ordered DESC)
  }

  const result = [...byTicker.values()].sort((a, b) =>
    (LEVEL_RANK[b.signal_level] ?? 0) - (LEVEL_RANK[a.signal_level] ?? 0) ||
    a.drawdown_pct - b.drawdown_pct   // most negative first within same level
  )

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
  })
}
