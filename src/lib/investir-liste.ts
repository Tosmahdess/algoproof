// La liste des sociétés, sans le paquet.
//
// `lib/investir` importe le JSON des fiches (1,2 Mo) au niveau du module : un
// composant client qui en importait une fonction l'embarquait entier dans le
// bundle du navigateur, 561 Ko gzip préchargés par le lien « Sociétés » de la
// nav sur toutes les pages (audit 2026-10, n° 20). Tout ce que la liste lit vit
// ici, sans aucun import de données ; `lib/investir` le réexporte.
import type { Contexte, FicheIndex } from '@/lib/investir'
import { frNumber } from '@/lib/display'

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

// L'ordre alphabétique d'un lecteur français, pas celui de la table ASCII :
// « AZZ » passait avant « AbbVie » et « lululemon » finissait la liste (audit
// 2026-10, n° 49). Casse et accents ignorés, nombres lus comme des nombres.
const COLLATOR = new Intl.Collator('fr', { sensitivity: 'base', numeric: true })

export function trierParNom<T extends { name: string }>(lignes: readonly T[]): T[] {
  return [...lignes].sort((a, b) => COLLATOR.compare(a.name, b.name))
}

// Une recherche qui ne dépend ni de la casse ni des accents : « hermes » trouve
// « Hermès », « societe » trouve « Société ».
export function normaliser(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Le nom ou le symbole contient la requête (déjà normalisée). Requête vide : tout passe. */
export function correspond(
  ligne: { name: string; symbole?: string | null; ticker?: string | null },
  requete: string,
): boolean {
  if (!requete) return true
  if (normaliser(ligne.name).includes(requete)) return true
  const symbole = ligne.symbole ?? ligne.ticker ?? ''
  // « NYSE:CCI » se cherche aussi par « CCI ».
  return normaliser(symbole).includes(requete)
}

// Ce que dit la liste quand elle est vide, selon la cause (audit 2026-10,
// n° 13) : elle disait « Retire un filtre » à qui n'en avait mis aucun, sans
// bouton pour effacer la recherche.
export function messageVide({ recherche, filtres, total }: {
  /** La recherche telle que tapée, espaces de bord retirés. */
  recherche: string
  /** Le nombre de filtres actifs (la recherche n'en est pas un). */
  filtres: number
  /** Le nombre de sociétés lues, toutes filtres levés. */
  total: number
}): string {
  const q = recherche.trim()
  const ces = filtres > 1 ? 'ces filtres' : 'ce filtre'
  if (q && filtres > 0) return `Aucune société ne correspond à « ${q} » avec ${ces}.`
  if (q) return `Aucune des ${frNumber(total, 0)} sociétés que je lis ne correspond à « ${q} ».`
  return `Aucune société ne correspond à ${filtres > 1 ? 'cette combinaison de filtres' : 'ce filtre'}.`
}
