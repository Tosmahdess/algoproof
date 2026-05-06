import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

// Returns last 50 growth alerts, most recent first — cache 5 min
export async function GET() {
  const { data, error } = await supabaseServer
    .from('growth_alerts')
    .select('id,alerted_at,ticker,asset_name,drawdown_pct,ma50_gap_pct,rsi14,signal_level,confidence,market_regime,mi_score,mi_regime,current_price,high_90d,suggested_min,suggested_max,indicators')
    .order('alerted_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json([], { status: 200 })

  return NextResponse.json(data ?? [], {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
  })
}
