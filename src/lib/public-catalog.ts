// What a reader can keep in Mon espace, published by the site that owns it
// (espace-direct lot C). Strategy pages and company pages exist only in this
// repo: a TS list (strategy-library.ts) and two JSON files (investir.ts). The
// lab's API reads these two lists (GET /api/catalog/strategies and
// /api/catalog/companies) to accept a star and label a favorite, instead of a
// copy in the lab repo that would drift.
//
// Allowlisted fields only. A company's analysis, alerts and figures stay on its
// page: the paid récit is served by /api/investir/[slug]/recit after an
// entitlement check, never through this list.
import { STRATEGY_FICHES } from '@/lib/strategy-library'
import { ficheParSlug, listeHorsPerimetre, tousLesSlugs } from '@/lib/investir'

export type StrategyEntry = { slug: string; title: string; family: string }
export type CompanyEntry = { slug: string; name: string; ticker: string | null; category: string | null }

export function strategyCatalog(): StrategyEntry[] {
  return STRATEGY_FICHES.map(f => ({ slug: f.slug, title: f.title, family: f.family }))
}

export function companyCatalog(): CompanyEntry[] {
  const inScope = tousLesSlugs().map(slug => {
    const f = ficheParSlug(slug) as unknown as { slug: string; name: string; ticker?: string | null; famille?: string | null }
    return { slug: f.slug, name: f.name, ticker: f.ticker ?? null, category: f.famille ?? null }
  })
  const outOfScope = listeHorsPerimetre().map(f => ({
    slug: f.slug, name: f.name, ticker: f.ticker ?? null, category: f.categorie ?? null,
  }))
  return [...inScope, ...outOfScope]
}
