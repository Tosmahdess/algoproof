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
  // Assez grande pour que la mesure du flottant tienne : flottant >= 2 Md$ ou
  // chiffre d'affaires >= 3 Md$. Ne décide PLUS ce qui est publié, sert de
  // filtre au lecteur.
  core: boolean
  // Le secteur, tel qu'il est nommé dans la fiche : c'est le même mot qui sert
  // de comparateur à l'ancre de valorisation, donc le lecteur le retrouve d'une
  // page à l'autre. 235 fiches sur 1 407 n'en ont pas de nommé.
  famille: string | null
}

// Les faits saillants, DÉJÀ rendus par les formateurs de la page : le site n'a
// aucun arrondi à faire, donc aucun moyen d'en inventer un.
export type Chiffres = {
  ca: string | null
  resultat: string | null
  marge: string | null
  part_actionnaires: string | null
  annees_de_valorisation: string | null
  mediane_du_secteur: string | null
  secteur: string | null
}

export type Fiche = FicheIndex & {
  taxonomy: string | null
  filed: string | null
  filing_accn: string | null
  chiffres: Chiffres
  // Le symbole boursier, seulement quand le registre n'en donne qu'un seul sur
  // une place principale. 142 fiches sur 1 407 n'en ont pas : préférentielles,
  // bons de souscription, deux classes ordinaires. On ne devine pas.
  ticker: string | null
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
// Le RÉCIT tient la pleine largeur : c'est ce qu'on vient lire, et aucun
// gabarit ne peut l'écrire. Les COMPTES sont déterministes et se consultent —
// ils vivent dans un bloc replié, sous un bandeau qui en donne l'essentiel.
// Seule l'activite reste dans le paquet statique. La lecture et les risques
// sont vendus : ils vivent dans Supabase et passent par une route qui lit
// l'abonnement, parce qu'une page pre-generee sert le meme HTML a tout le monde.
export const RECIT: { cle: string; titre: string }[] = [
  { cle: 'activite', titre: 'Ce que fait l’entreprise' },
]

export const COMPTES: { cle: string; titre: string }[] = [
  { cle: 'fondamentaux', titre: 'Trois exercices, ligne à ligne' },
  { cle: 'sante',        titre: 'Ce que ces trois séries disent' },
  { cle: 'bilan',        titre: 'Ce qu’elle possède, ce qu’elle doit' },
  { cle: 'valorisation', titre: 'Ce qu’elle vaut, et à quelle date' },
]

export const BLOCS: { cle: string; titre: string }[] = [
  { cle: 'activite',     titre: 'Ce que fait l’entreprise' },
  { cle: 'fondamentaux', titre: 'Les comptes' },
  { cle: 'sante',        titre: 'Comment se porte l’entreprise' },
  { cle: 'bilan',        titre: 'Ce qu’elle possède, ce qu’elle doit' },
  { cle: 'valorisation', titre: 'Ce qu’elle vaut, et à quelle date' },
  // La LECTURE vient APRÈS les faits, jamais sous la note : un paragraphe qui
  // cite une marge avant que la page ne l’ait imprimée se lit comme une
  // affirmation ; après, il se lit comme une lecture.
  { cle: 'lecture',      titre: 'Ce que j’en retiens' },
  { cle: 'risques',      titre: 'Ce qui peut mal tourner' },
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
