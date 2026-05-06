import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

// Cache 60s — MI updates every ~60s on VPS but 1 min staleness is acceptable
export async function GET() {
  const { data, error } = await supabaseServer
    .from('mi_snapshots')
    .select('snapshot_at,composite_score,regime,is_safe,is_macro_safe,sentiment_score,derivatives_score,news_score,macro_score')
    .order('snapshot_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return NextResponse.json(null, { status: 200 })

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
    },
  })
}
