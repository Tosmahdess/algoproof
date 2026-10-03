// Les sept contrôles, et l'état de chacun sur une fiche (audit 2026-10, n° 53).
//
// La fiche rendait le bloc `alertes` du moteur tel quel : cinq phrases sans
// majuscule dans un seul paragraphe, et les contrôles sans alerte nulle part.
// Le lecteur lisait « 5 alertes sur 7 contrôles lus » sans pouvoir dire
// lesquels étaient les deux autres. Ici, chaque contrôle a une ligne et un état :
// alerte, sans alerte, non lu. Jamais une note, jamais un adjectif : un état de
// lecture, et le fait qui le porte.
//
// Aucune donnée n'est importée : la page des sociétés et la fiche lisent ce
// module, la liste client aussi, et un import de `lib/investir` ici remettrait
// le paquet dans le bundle du navigateur.

export type EtatControle = 'alerte' | 'sans-alerte' | 'non-lu'

export type Controle = {
  cle: string
  /** Le nom du contrôle, en casse de phrase. */
  nom: string
  /** La règle, mot pour mot celle du moteur. */
  regle: string
  /** Les identifiants d'alerte que ce contrôle peut lever (au plus un à la fois). */
  alertes: readonly string[]
  /** L'identifiant sous lequel le moteur range ce contrôle quand il ne l'a pas lu. */
  nonLu: string | null
}

// L'ordre et les règles du moteur. Les identifiants se lisent dans le paquet :
// `contexte.libelles` pour les alertes, `contexte.libelles_non_lus` pour les
// contrôles non lus. Le test `investir-controles` vérifie sur les 1 406 fiches
// qu'aucun contrôle ne porte deux alertes et qu'aucune alerte ne tombe sur un
// contrôle non lu : si le moteur change ses identifiants, il échoue.
export const SEPT_CONTROLES: readonly Controle[] = [
  { cle: 'pertes', nom: 'Pertes', regle: '2 exercices en perte sur 3, ou un seul',
    alertes: ['pertes_recurrentes', 'perte_unique'], nonLu: null },
  { cle: 'chiffre_affaires', nom: 'Chiffre d’affaires', regle: 'sous son niveau d’il y a deux ans',
    alertes: ['ca_sous_niveau'], nonLu: null },
  { cle: 'resultat', nom: 'Résultat', regle: 'sous son niveau d’il y a deux ans',
    alertes: ['resultat_sous_niveau'], nonLu: null },
  { cle: 'dilution', nom: 'Dilution', regle: 'actions +10 % en deux ans',
    alertes: ['dilution'], nonLu: null },
  { cle: 'capitaux_propres', nom: 'Capitaux propres', regle: 'négatifs',
    alertes: ['capitaux_propres_negatifs'], nonLu: 'capitaux_propres' },
  { cle: 'dette', nom: 'Dette long terme',
    regle: 'nette de la trésorerie, au-dessus du double de la médiane de son secteur',
    alertes: ['dette_nette'], nonLu: 'dette_nette' },
  { cle: 'tresorerie', nom: 'Trésorerie', regle: 'face aux pertes du dernier exercice',
    alertes: ['perte_avec_dette_nette'], nonLu: 'lecture_tresorerie' },
]

export const ETAT_LIBELLE: Record<EtatControle, string> = {
  'alerte': 'Alerte',
  'sans-alerte': 'Sans alerte',
  'non-lu': 'Non lu',
}

/** La première lettre en capitale, le reste tel que le moteur l'a écrit. */
export function capitale(s: string): string {
  return s ? s.charAt(0).toLocaleUpperCase('fr-FR') + s.slice(1) : s
}

export type PhrasesAlertes = {
  /** Une phrase par alerte, dans l'ordre de `fiche.alertes`. */
  alertes: string[]
  /** La lecture de la trésorerie qui accompagne une perte (« En regard, … »), ou null. */
  regard: string | null
  /** Une raison par contrôle non lu, dans l'ordre de `fiche.non_lus`, sans « Non lu : ». */
  nonLus: string[]
}

// Le bloc `alertes` du moteur mêle trois natures d'énoncé, séparées par leur
// amorce : l'alerte nue (en minuscule), « En regard, … », « Non lu : … ». Une
// phrase se termine par un point suivi d'une minuscule ou d'une de ces amorces ;
// les nombres s'écrivent à la française (virgule décimale), donc un point dans
// une phrase n'en coupe aucune.
export function phrasesDesAlertes(bloc: string | null | undefined): PhrasesAlertes {
  const phrases = (bloc ?? '').trim()
    .split(/(?<=\.)\s+(?=[a-zà-ÿ]|En regard|Non lu)/u)
    .map(s => s.trim())
    .filter(Boolean)
  const out: PhrasesAlertes = { alertes: [], regard: null, nonLus: [] }
  for (const p of phrases) {
    if (p.startsWith('Non lu')) out.nonLus.push(p.replace(/^Non lu\s*:\s*/, ''))
    else if (p.startsWith('En regard')) out.regard = p.replace(/^En regard,\s*/, '')
    else out.alertes.push(p)
  }
  return out
}

export type LectureControle = Controle & {
  etat: EtatControle
  /** Ce que j'ai relevé pour ce contrôle, phrase du moteur en casse de phrase, ou null. */
  fait: string | null
}

/**
 * L'état de chacun des sept contrôles sur une fiche.
 *
 * Les phrases viennent du bloc du moteur. Si le bloc ne se découpe pas en autant
 * de phrases que la fiche porte d'alertes et de non-lus, aucune phrase n'est
 * rattachée à un contrôle (une phrase mal rattachée dirait un fait faux sur le
 * mauvais contrôle) : l'alerte prend son libellé du moteur, le reste n'a pas de fait.
 */
export function lireControles(
  fiche: { alertes: readonly string[]; non_lus: readonly string[] },
  bloc: string | null | undefined,
  libelles: Record<string, string>,
): LectureControle[] {
  const p = phrasesDesAlertes(bloc)
  const fiable = p.alertes.length === fiche.alertes.length && p.nonLus.length === fiche.non_lus.length
  return SEPT_CONTROLES.map(c => {
    const iAlerte = fiche.alertes.findIndex(a => c.alertes.includes(a))
    if (iAlerte >= 0) {
      const id = fiche.alertes[iAlerte]
      const fait = fiable ? p.alertes[iAlerte] : (libelles[id] ?? null)
      return { ...c, etat: 'alerte', fait: fait ? capitale(fait) : null }
    }
    const iNonLu = c.nonLu ? fiche.non_lus.indexOf(c.nonLu) : -1
    if (iNonLu >= 0) {
      return { ...c, etat: 'non-lu', fait: fiable ? capitale(p.nonLus[iNonLu]) : null }
    }
    const regard = c.cle === 'tresorerie' && fiable && p.regard ? capitale(p.regard) : null
    return { ...c, etat: 'sans-alerte', fait: regard }
  })
}
