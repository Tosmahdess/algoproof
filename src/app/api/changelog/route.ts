import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

const COLS = 'id,created_at,scope_type,bot_slug,applies_to,entry_date,category,summary,detail,session_ref'
const ALLOWED = new Set(['mi', 'wealth'])

export async function GET(req: NextRequest) {
  const scope = req.nextUrl.searchParams.get('scope') ?? ''
  if (!ALLOWED.has(scope)) {
    return NextResponse.json({ error: 'invalid scope' }, { status: 400 })
  }
  const { data, error } = await supabaseServer
    .from('bot_changelogs')
    .select(COLS)
    .eq('scope_type', scope)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data ?? [])
}
