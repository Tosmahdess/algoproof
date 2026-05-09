import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

// Returns last 100 growth alerts, most recent first — cache 5 min
export async function GET() {
  const { data, error } = await supabaseServer
    .from('growth_alerts')
    .select('id,alerted_at,ticker,asset_name,drawdown_pct,signal_level,mi_regime,mi_score,current_price,high_90d,suggested_min,suggested_max')
    .order('alerted_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json([], { status: 200 })

  return NextResponse.json(data ?? [], {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
  })
}
