// GET /api/catalog/strategies: the strategy pages a reader can keep in Mon espace
// (espace-direct lot C). Read by the lab's API, see lib/public-catalog.ts.
import { NextResponse } from 'next/server'
import { strategyCatalog } from '@/lib/public-catalog'

// Built with the site: the list changes only when a fiche is added, i.e. on deploy.
export const dynamic = 'force-static'

export async function GET() {
  return NextResponse.json({ items: strategyCatalog() })
}
