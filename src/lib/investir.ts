// Lecture du paquet Investir, produit par apex-wealth
// (`research/universe/export_site.py`) et commité tel quel dans ce dépôt.
//
// Pourquoi un JSON commité plutôt qu'une table : le contenu publié est alors
// DANS le commit. Une fiche affirme qu'un lecteur peut refaire son calcul à
// partir d'un document daté ; il faut donc aussi pouvoir dire quelle version de
// la page disait quoi, et un git blame le fait mieux qu'une base.
//
// La séparation index / fiches n'est pas cosmétique. `index` ne porte pas une
// phrase de prose : il est servi en entier à la liste, et tout ce qu'on y
// laisserait voyagerait jusqu'au navigateur de chaque visiteur.
import paquet from '@/data/investir.json'

export type Grade = 'solide' | 'a surveiller' | 'fragile' | 'non note'

export type FicheIndex = {
  slug: string
  cik: number
  name: string
  grade: Grade
  gate: string | null
  anchor: string | null
  currency: string | null
  valuation_years: number | null
}

export type Fiche = FicheIndex & {
  taxonomy: string | null
  filed: string | null
  filing_accn: string | null
  blocs: Record<string, string>
}

export type Contexte = {
  mediane_annees: number
  societes_notees: number
  plafond_annees: number
}

const data = paquet as unknown as {
  as_of: string
  contexte: Contexte
  refusees: Record<string, number>
  index: FicheIndex[]
  fiches: Fiche[]
}

export const asOf = data.as_of
export const contexte = data.contexte
export const refusees = data.refusees

export function listeInvestir(): FicheIndex[] {
  return data.index
}

export function ficheParSlug(slug: string): Fiche | undefined {
  return data.fiches.find(f => f.slug === slug)
}

export function tousLesSlugs(): string[] {
  return data.fiches.map(f => f.slug)
}

export function compteParNote(): Record<Grade, number> {
  const out = { solide: 0, 'a surveiller': 0, fragile: 0, 'non note': 0 } as Record<Grade, number>
  for (const f of data.index) out[f.grade] += 1
  return out
}

// L'ordre de lecture des blocs, et leur titre affiché. `verdict` est rendu à
// part, en tête de fiche : c'est la conclusion, pas une section.
export const BLOCS: { cle: string; titre: string }[] = [
  { cle: 'activite',     titre: 'Ce que fait l’entreprise' },
  { cle: 'fondamentaux', titre: 'Les comptes' },
  { cle: 'valorisation', titre: 'Ce qu’elle vaut, et à quelle date' },
  { cle: 'risques',      titre: 'Ce qui peut mal tourner' },
  { cle: 'perimetre',    titre: 'Ce que cette fiche ne dit pas' },
  { cle: 'source',       titre: 'Refais-le toi-même' },
]

export const LIBELLE_NOTE: Record<Grade, string> = {
  'solide':       'Comptes solides',
  'a surveiller': 'À surveiller',
  'fragile':      'Fragile',
  'non note':     'Je ne note pas',
}

// solide → vert, à surveiller → ambre, fragile → rouge. Les mêmes jetons que
// le reste du site, pour qu'une note se lise sans apprendre un code de plus.
export const COULEUR_NOTE: Record<Grade, string> = {
  'solide':       'text-positive border-positive/40 bg-positive/10',
  'a surveiller': 'text-warning border-warning/40 bg-warning/10',
  'fragile':      'text-negative border-negative/40 bg-negative/10',
  'non note':     'text-muted border-border bg-card',
}

// Un nombre décimal rendu tel quel par JSX sort avec un POINT : la page a
// affiché « 23.9 ans » en production. Tous les nombres décimaux de la page
// passent par ici. Le côté Python formate déjà en français ; c'était le seul
// endroit où un nombre traversait la frontière sans être mis en forme.
export function decimalFr(n: number): string {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
}
