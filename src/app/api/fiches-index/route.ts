import { NextResponse } from 'next/server'
import { getAllFiches } from '@/lib/equity'

export const runtime = 'nodejs'
export const revalidate = 3600

// Full fiche index (ticker + asset_name + category + verdict) for client pages
// that need the sector-grouped view (e.g. /wealth). /api/equity-fiche stays the
// lighter covered-fiche payload (verdict + live price) used by the Top picks.
export async function GET() {
  const list = await getAllFiches()
  return NextResponse.json(list)
}
