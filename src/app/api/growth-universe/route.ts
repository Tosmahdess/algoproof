import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

const SIGNAL_RANK: Record<string, number> = {
  crash: 3,
  major: 2,
  minor: 1,
}

export async function GET() {
  const { data, error } = await supabaseServer
    .from('growth_universe')
    .select('*')

  if (error) {
    console.error('[growth-universe]', error.message)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }

  const sorted = (data ?? []).sort((a, b) => {
    const rankA = SIGNAL_RANK[a.signal_level] ?? 0
    const rankB = SIGNAL_RANK[b.signal_level] ?? 0
    if (rankB !== rankA) return rankB - rankA
    const ddA = a.drawdown_pct ?? 0
    const ddB = b.drawdown_pct ?? 0
    return ddA - ddB
  })

  return NextResponse.json(sorted)
}
