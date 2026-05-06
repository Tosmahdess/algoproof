import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

// Returns both wealth_calls and asset_prices in one request
export async function GET() {
  const [callsRes, pricesRes] = await Promise.all([
    supabaseServer
      .from('wealth_calls')
      .select('id,executed_at,asset,portfolio,amount_eur,multiplier,signal_level,venue,price_eur,quantity')
      .order('executed_at', { ascending: true }),
    supabaseServer
      .from('asset_prices')
      .select('asset,price_eur,source,updated_at'),
  ])

  return NextResponse.json(
    {
      calls:  callsRes.data  ?? [],
      prices: pricesRes.data ?? [],
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    }
  )
}
