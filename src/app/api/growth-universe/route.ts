import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SIGNAL_RANK: Record<string, number> = {
  crash: 3,
  major: 2,
  minor: 1,
}

export async function GET() {
  const { data, error } = await supabase
    .from('growth_universe')
    .select('*')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
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
