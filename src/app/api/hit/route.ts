// POST /api/hit: one page_hits row per page view (lot 8 of the design audit,
// 2026-09-25). Written with the service key: the table has no policy, so anon
// can neither read nor write it (migration 056). A crawler's hit is answered
// and dropped; a body that is not a hit is a 400; a missing service key is a
// silent 204, never a 500 on every page. Same-origin only: PageHit posts from
// this site's own pages, so no CORS.
import { NextRequest, NextResponse } from 'next/server'
import { supabasePrivileged } from '@/lib/supabase-privileged'
import { parseHit, isBotUA } from '@/lib/page-hit'

export const runtime = 'nodejs'

const noContent = () => new NextResponse(null, { status: 204 })

export async function POST(request: NextRequest) {
  if (isBotUA(request.headers.get('user-agent'))) return noContent()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const hit = parseHit(body)
  if (!hit) return NextResponse.json({ error: 'Not a hit' }, { status: 400 })

  const db = supabasePrivileged()
  if (!db) return noContent()
  // A failed insert is not the visitor's problem: the page is already shown.
  await db.from('page_hits').insert(hit).then(() => undefined, () => undefined)
  return noContent()
}
