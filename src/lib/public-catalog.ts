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
import { familyLabel } from '@/lib/families'
import { ficheParSlug, listeHorsPerimetre, tousLesSlugs } from '@/lib/investir'
import { CATEGORY_LABELS } from '@/lib/fiche-categories'
import { ideaSlug, type LibraryIdea } from '@/lib/library'
import { engineBaseLabel } from '@/lib/engine-base-labels'
import type { Family } from '@/lib/families'

// family_label: the site's own words for the family, so the lab neither copies the
// table nor shows « trend » where the site says « Suivi de tendance ».
export type StrategyEntry = { slug: string; title: string; family: string; family_label: string }
export type IdeaEntry = { slug: string; title: string; idea_key: string; tf: string; family: string; family_label: string }
export type CompanyEntry = { slug: string; name: string; ticker: string | null; category: string | null }

export function strategyCatalog(): StrategyEntry[] {
  return STRATEGY_FICHES.map(f => ({ slug: f.slug, title: f.title, family: f.family, family_label: familyLabel(f.family) }))
}

export function companyCatalog(): CompanyEntry[] {
  const inScope = tousLesSlugs().map(slug => {
    const f = ficheParSlug(slug) as unknown as { slug: string; name: string; ticker?: string | null; famille?: string | null }
    return { slug: f.slug, name: f.name, ticker: f.ticker ?? null, category: f.famille ?? null }
  })
  const outOfScope = listeHorsPerimetre().map(f => ({
    // The site's label, never the machine key: five categories had none on
    // 2026-10-01 (auto_ev, consumer_premium, fintech_payment, gaming,
    // space_economy), they publish no category rather than « auto_ev ».
    slug: f.slug, name: f.name, ticker: f.ticker ?? null, category: (f.categorie && CATEGORY_LABELS[f.categorie]) || null,
  }))
  return [...inScope, ...outOfScope]
}

/** The library's ideas (chantier bibliotheque, lot 2), for idea favorites. The slug is
 *  the item's identity in the lab (source_key): it never changes, and two ideas may
 *  never share one, so a collision stops the list instead of merging two ideas' stars. */
export function ideaCatalog(ideas: LibraryIdea[]): IdeaEntry[] {
  const seen = new Map<string, string>()
  return ideas.map(i => {
    const slug = ideaSlug(i.idea_key)
    const other = seen.get(slug)
    if (other) throw new Error(`idea slug ${slug} shared by ${other} and ${i.idea_key}`)
    seen.set(slug, i.idea_key)
    return { slug, title: `${engineBaseLabel(i.base)} ${i.tf}`, idea_key: i.idea_key, tf: i.tf,
      family: i.family, family_label: familyLabel(i.family as Family) }
  })
}
