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

// La phrase de résidu et les deux comptes de la liste vivent dans
// `lib/investir-liste`, un module sans données : la liste est un composant
// client, et tout ce qu'elle importait d'ici emportait le paquet entier dans le
// bundle du navigateur (audit 2026-10, n° 20). Réexportés pour les appels serveur.
export { residuDe, compteParAlerte, compteParCouverture } from '@/lib/investir-liste'

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
// Vingt-quatre sociétés dont mes sept contrôles ne lisent pas les comptes.
// Leur analyse vient de /wealth, écrite à partir de données de marché : aucun de
// leurs chiffres ne vient d'un dépôt, et la fiche le dit en toutes lettres.
//
// Toutes ne sont pas dehors pour la même raison, et la fiche dit laquelle
// (audit 2026-10, n° 14 : « Elle ne dépose pas de rapport annuel auprès du
// régulateur américain » était écrit sur les 27, et faux pour neuf). La cause
// a été relue sur EDGAR le 2026-10-03, formulaire par formulaire :
// - `sans_depot` : ni 10-K ni 20-F au dossier (dix-sept sociétés, toutes
//   cotées hors des États-Unis) ;
// - `depot_non_lu` : un 10-K ou un 20-F au dossier, que la règle ne lit pas
//   encore (Visa, AeroVironment, Planet Labs, ASML, TSMC, Sanofi) ;
// - `enregistrement_clos` : des 10-K au dossier, puis un formulaire 15 qui met
//   fin à l'enregistrement (Electronic Arts, le 2026-08-14).
//
// Elles vivent dans un fichier SÉPARÉ, et c'est délibéré : mélangées aux 1 406,
// un jour quelqu'un les compterait dans une médiane ou dans un total, et la
// page annoncerait un chiffre qui ne veut rien dire.
import horsPerimetreBrut from '@/data/investir-hors-perimetre.json'
import { longDate } from '@/lib/format-date'

export type CauseHorsPerimetre = 'sans_depot' | 'depot_non_lu' | 'enregistrement_clos'

export type FicheHorsPerimetre = {
  slug: string
  name: string
  ticker: string
  categorie: string | null
  description: string | null
  as_of: string
  cause: CauseHorsPerimetre
  // Le dossier EDGAR, pour une société qui dépose ou a déposé : la page le
  // donne en lien, pour que « elle dépose » se vérifie comme le reste.
  cik?: number
  // `enregistrement_clos` seulement : le dernier rapport annuel et le
  // formulaire 15, tels que datés sur EDGAR.
  dernier_rapport?: string
  fin_enregistrement?: string
}

export function listeHorsPerimetre(): FicheHorsPerimetre[] {
  return (horsPerimetreBrut as { fiches: FicheHorsPerimetre[] }).fiches
}

export function horsPerimetreParSlug(slug: string): FicheHorsPerimetre | null {
  return listeHorsPerimetre().find(f => f.slug === slug) ?? null
}

// Trois fiches retirées le 2026-10-03 (audit 2026-10, n° 14). Block et Philips
// déposent un rapport annuel que la règle LIT déjà, sous un autre slug : deux
// pages sur la même société se contredisaient. Solana n'est pas une société :
// il n'a pas de comptes à lire, et aucune page du site ne pointait vers sa
// fiche. Chaque ancienne adresse mène à la page qui la remplace (308).
export const HORS_PERIMETRE_RETIREES: Readonly<Record<string, string>> = {
  block: '/investir/block-inc',
  philips: '/investir/koninklijke-philips-nv',
  solana: '/investir',
}

export function redirectionHorsPerimetre(slug: string): string | null {
  return Object.hasOwn(HORS_PERIMETRE_RETIREES, slug) ? HORS_PERIMETRE_RETIREES[slug] : null
}

/** Pourquoi mes contrôles ne lisent pas cette société : une phrase par cause. */
export function phraseCause(f: FicheHorsPerimetre): string {
  switch (f.cause) {
    case 'depot_non_lu':
      return 'Elle dépose un rapport annuel auprès du régulateur américain, mais je ne lis pas encore ses comptes : mes sept contrôles ne tournent pas sur elle.'
    case 'enregistrement_clos':
      return `Elle a déposé des rapports annuels auprès du régulateur américain, le dernier le ${longDate(f.dernier_rapport!)}, puis a mis fin à son enregistrement le ${longDate(f.fin_enregistrement!)}. Je n’ai pas lu ses comptes : mes sept contrôles ne tournent pas sur elle.`
    case 'sans_depot':
    default:
      return 'Elle ne dépose auprès du régulateur américain ni 10-K ni 20-F, les deux rapports annuels que lisent mes sept contrôles : ils n’ont aucun document à lire.'
  }
}

/** La même chose pour la liste, en comptes : la somme fait toujours la liste. */
export function phraseListeHorsPerimetre(fiches: FicheHorsPerimetre[]): string {
  const sans = fiches.filter(f => f.cause === 'sans_depot').length
  const deposees = fiches.length - sans
  const parts: string[] = []
  if (sans > 0) {
    parts.push(`${sans} ${sans > 1 ? 'ne déposent' : 'ne dépose'} auprès du régulateur américain ni 10-K ni 20-F, les deux rapports annuels que lisent mes contrôles`)
  }
  if (deposees > 0) {
    parts.push(`${deposees} ${deposees > 1 ? 'y ont déposé un rapport annuel, mais je n’ai pas lu leurs comptes' : 'y a déposé un rapport annuel, mais je n’ai pas lu ses comptes'}`)
  }
  // One sentence, so that no sentence opens on a figure.
  return parts.length ? `${parts.join(' ; ')}.` : ''
}

/** L'adresse du dossier EDGAR d'une société qui dépose, ou null. */
export function dossierSec(f: FicheHorsPerimetre): string | null {
  return f.cik != null ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${f.cik}` : null
}
