// GET /api/catalog/companies: the company pages a reader can keep in Mon espace
// (espace-direct lot C). Names and categories only, never the analysis: see
// lib/public-catalog.ts. Read by the lab's API.
import { NextResponse } from 'next/server'
import { companyCatalog } from '@/lib/public-catalog'

// Built with the site: the fiches change only on deploy.
export const dynamic = 'force-static'

export async function GET() {
  return NextResponse.json({ items: companyCatalog() })
}
