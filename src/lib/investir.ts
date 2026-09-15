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

// La NOTE a disparu du moteur le 2026-09-14, et avec elle le type `Grade`.
// Elle se trompait dans les deux sens : 38 des 220 « solides » portant un bilan
// cachaient un signal de dette dur, et 50 des 189 « fragiles » (26,5 %) avaient
// de quoi financer plus de trois ans de pertes — CrowdStrike était « fragile »
// avec 27,6 années de trésorerie nette.
//
// Rien ne la remplace par un mot. Ce qui coupe la liste, ce sont les alertes
// nommées par le fait, et le nombre de contrôles qu'on a pu lire.
//
// Trois champs ont quitté l'index en même temps (`grade`, `gate`, `anchor`)
// parce que les trois étaient devenus CONSTANTS sur toute fiche publiée. Deux
// d'entre eux étaient affichés : le cartouche de note rendait `undefined` sur
// les 1 407 lignes, et la mention de l'ancre de valorisation, testée par une
// inégalité sur un champ désormais toujours nul, était vraie partout.
export type FicheIndex = {
  slug: string
  cik: number
  name: string
  currency: string | null
  // Les IDENTIFIANTS des alertes, jamais leurs phrases : `dilution` et
  // `dette_nette` interpolent les chiffres de la société, donc deux sociétés
  // alertées du même fait n'ont pas la même chaîne. Les libellés vivent dans
  // `contexte.libelles`, écrits par le moteur.
  alertes: string[]
  // Les contrôles que ce dépôt n'a pas permis de lire, par identifiant.
  non_lus: string[]
  // Combien des sept ont pu être lus. Jamais décoratif : sans lui, « aucune
  // alerte » est plus facile à obtenir là où moins de séries sont lues, et un
  // filtre dessus sur-sélectionnerait les fiches les moins couvertes.
  n_lus: number
  // Assez grande pour que la mesure du flottant tienne : flottant >= 2 Md$ ou
  // chiffre d'affaires >= 3 Md$. Ne décide PLUS ce qui est publié, sert de
  // filtre au lecteur.
  core: boolean
  // Le secteur, tel qu'il est nommé dans la fiche : c'est le même mot qui sert
  // de comparateur à l'ancre de valorisation, donc le lecteur le retrouve d'une
  // page à l'autre. 235 fiches sur 1 407 n'en ont pas de nommé.
  famille: string | null
  // Le symbole nu. Le bandeau des creux d'achat vient d'un autre pipeline qui
  // ne connaît que le ticker : sans lui ici, il faudrait rapprocher les
  // sociétés par leur raison sociale, et « MicroStrategy » n'est pas
  // « MICROSTRATEGY Inc ».
  symbole: string | null
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
  // « 2 alertes sur 6 contrôles lus (sur 7). » — de la prose, donc elle n'est
  // PAS dans l'index : la liste est servie en entier, une phrase par ligne
  // voyagerait 1 407 fois. Mais le site ne la réécrit pas non plus, sinon deux
  // formulations coexistent et dérivent (le pluriel d'« alerte » suffit à les
  // séparer). La phrase ne dépend que du couple (alertes, lus), soit au plus
  // une vingtaine de valeurs : le moteur exporte la table, la ligne y lit son
  // entrée. Clé : `${alertes.length}|${n_lus}`.
  residus: Record<string, string>
  // Le libellé de chaque puce d'alerte, par identifiant. Écrit par le moteur,
  // à côté des constantes qu'il nomme.
  libelles: Record<string, string>
  // Le nom court de chaque contrôle, pour la mention « Non lu : … ».
  libelles_non_lus: Record<string, string>
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

// La phrase de tête d'une ligne de liste, telle que le moteur l'a écrite.
//
// Rend la chaîne vide quand le couple est absent de la table, et c'est
// délibéré : une phrase composée ici serait indiscernable d'une phrase du
// moteur, et se mettrait à diverger le jour où le moteur change de
// formulation. Rien vaut mieux qu'une seconde implémentation.
export function residuDe(
  ligne: Pick<FicheIndex, 'alertes' | 'n_lus'>,
  residus: Contexte['residus'],
): string {
  return residus[`${ligne.alertes.length}|${ligne.n_lus}`] ?? ''
}

// Les puces d'alerte, dérivées des lignes présentes — jamais d'une liste figée.
// Une puce sans ligne derrière se vide au clic sans que le lecteur sache
// pourquoi. À effectif égal, l'identifiant départage : sans ordre stable, deux
// rendus de la même liste montrent les puces dans un ordre différent.
export function compteParAlerte(lignes: FicheIndex[]): [string, number][] {
  const compte = new Map<string, number>()
  for (const l of lignes) {
    for (const motif of l.alertes) compte.set(motif, (compte.get(motif) ?? 0) + 1)
  }
  return [...compte.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

// Le groupe « Couverture ». Il rend l'opacité VISIBLE au lieu de la
// récompenser : c'est le pendant honnête du filtre « aucune alerte » qu'on
// n'offre pas, parce qu'il sur-sélectionnerait les fiches les moins couvertes.
export function compteParCouverture(lignes: FicheIndex[]): [number, number][] {
  const compte = new Map<number, number>()
  for (const l of lignes) compte.set(l.n_lus, (compte.get(l.n_lus) ?? 0) + 1)
  return [...compte.entries()].sort((a, b) => b[0] - a[0])
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

// `LIBELLE_NOTE` et `COULEUR_NOTE` ont été retirés avec la note. Le vert /
// ambre / rouge partait d'une bonne intention — les mêmes jetons que le reste
// du site — et c'est précisément ce qui en faisait un verdict : une couleur
// range une société sur une échelle avant qu'on ait lu la moindre phrase.
//
// Une alerte n'a pas de couleur. Elle a un fait, et le fait se lit.

// Un nombre décimal rendu tel quel par JSX sort avec un POINT : la page a
// affiché « 23.9 ans » en production. Tous les nombres décimaux de la page
// passent par ici. Le côté Python formate déjà en français ; c'était le seul
// endroit où un nombre traversait la frontière sans être mis en forme.
export function decimalFr(n: number): string {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
}

// --- Les sociétés hors périmètre ---------------------------------------------
//
// Vingt-sept sociétés que la règle ne peut PAS noter : dix-sept ne sont pas
// cotées aux États-Unis et ne déposent donc rien auprès du régulateur
// américain, les autres sortent des portes d'éligibilité. Leur analyse vient de
// /wealth, écrite à partir de données de marché : aucun de leurs chiffres n'est
// adossé à un dépôt, et la fiche le dit en toutes lettres.
//
// Elles vivent dans un fichier SÉPARÉ, et c'est délibéré : mélangées aux 1 407,
// un jour quelqu'un les compterait dans une médiane ou dans un total, et la
// page annoncerait un chiffre qui ne veut rien dire.
import horsPerimetreBrut from '@/data/investir-hors-perimetre.json'

export type FicheHorsPerimetre = {
  slug: string
  name: string
  ticker: string
  categorie: string | null
  description: string | null
  as_of: string
}

export function listeHorsPerimetre(): FicheHorsPerimetre[] {
  return (horsPerimetreBrut as { fiches: FicheHorsPerimetre[] }).fiches
}

export function horsPerimetreParSlug(slug: string): FicheHorsPerimetre | null {
  return listeHorsPerimetre().find(f => f.slug === slug) ?? null
}
