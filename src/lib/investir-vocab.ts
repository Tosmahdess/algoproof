/** Les mots comptables employés sur toutes les fiches Investir.
 *
 * Ils sont définis une fois sur la page d'entrée. Les fiches gardent ensuite
 * les termes standards, ce qui évite de réécrire 1 407 fois la même parenthèse.
 */
export const INVESTIR_VOCAB = [
  ['Exercice', 'La période couverte par les comptes annuels. Elle ne suit pas toujours l’année civile.'],
  ['Chiffre d’affaires', 'Tout ce que la société a vendu avant de retirer ses charges.'],
  ['Résultat net', 'Ce qu’elle a gagné ou perdu après toutes ses charges et ses impôts. Ce n’est pas sa trésorerie.'],
  ['Marge nette', 'La part du chiffre d’affaires qui reste en résultat net.'],
  ['Capitaux propres', 'Ce qui reste aux actionnaires dans le bilan après avoir retiré les dettes et autres obligations.'],
  ['Dilution', 'Une hausse du nombre d’actions : chaque action existante représente alors une part plus petite de la société.'],
  ['Médiane du secteur', 'Le point milieu des sociétés comparables : une moitié est au-dessus, l’autre en dessous.'],
] as const
