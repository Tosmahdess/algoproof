import { NextResponse } from 'next/server'
import { getCoveredFiches } from '@/lib/equity'
import { getFreeTickers } from '@/lib/free-tier'
import { getEntitlement } from '@/lib/entitlement'
import { createSupabaseAuthServer } from '@/lib/supabase-auth'
import { gateFicheList } from '@/lib/gate-fiche-list'

export const runtime = 'nodejs'
// force-dynamic replaces `revalidate = 600`; see fiches-index for why.
export const dynamic = 'force-dynamic'

export async function GET() {
  const [list, freeTickers, supabase] = await Promise.all([
    getCoveredFiches(),
    getFreeTickers(),
    createSupabaseAuthServer(),
  ])
  const entitlement = await getEntitlement(supabase)
  return NextResponse.json(gateFicheList(list, entitlement, freeTickers))
}
