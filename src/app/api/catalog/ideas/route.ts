// GET /api/catalog/ideas: the library ideas a reader can keep in Mon espace (chantier
// bibliotheque, lot 2). Read by the lab's API, as /api/catalog/strategies (D081).
// From the database, not the repo: cached like the library's own read (30 min).
import { NextResponse } from 'next/server'
import { getLibraryIdeas } from '@/lib/library'
import { ideaCatalog } from '@/lib/public-catalog'

export const revalidate = 1800

export async function GET() {
  return NextResponse.json({ items: ideaCatalog(await getLibraryIdeas()) })
}
