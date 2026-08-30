import { NextResponse } from 'next/server'
import { getAllFiches } from '@/lib/equity'
import { getFreeTickers } from '@/lib/free-tier'
import { getEntitlement } from '@/lib/entitlement'
import { createSupabaseAuthServer } from '@/lib/supabase-auth'
import { gateFicheList } from '@/lib/gate-fiche-list'

export const runtime = 'nodejs'
// force-dynamic replaces `revalidate = 3600`. The body now depends on who is
// asking; a cached copy would serve one visitor's entitlement to the next.
export const dynamic = 'force-dynamic'

// Full fiche index (ticker + asset_name + category + verdict) for client pages
// that need the sector-grouped view (e.g. /wealth). /api/equity-fiche stays the
// lighter covered-fiche payload (verdict + live price) used by the Top picks.
export async function GET() {
  const [list, freeTickers, supabase] = await Promise.all([
    getAllFiches(),
    getFreeTickers(),
    createSupabaseAuthServer(),
  ])
  const entitlement = await getEntitlement(supabase)
  return NextResponse.json(gateFicheList(list, entitlement, freeTickers))
}
