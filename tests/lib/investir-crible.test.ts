/**
 * Le crible d'alertes, côté liste.
 *
 * La note (« Comptes solides » / « À surveiller » / « Fragile ») a disparu du
 * moteur le 2026-09-14 : elle se trompait dans les deux sens — 38 des 220
 * « solides » portant un bilan cachaient un signal de dette dur, et 50 des 189
 * « fragiles » avaient de quoi financer plus de trois ans de pertes.
 *
 * Ce qui coupe la liste maintenant, ce sont les alertes nommées par le fait.
 * Trois règles tiennent ce fichier :
 *
 *  1. La liste filtre sur des IDENTIFIANTS, jamais sur la phrase — `dilution`
 *     et `dette_nette` interpolent les chiffres de la société, donc deux
 *     sociétés alertées du même fait n'ont pas la même chaîne.
 *  2. Le libellé d'une puce et la phrase de résidu viennent du MOTEUR. Les
 *     réécrire ici ferait deux formulations, et deux formulations dérivent.
 *  3. Le compte d'alertes ne se montre jamais sans son dénominateur : « aucune
 *     alerte » est plus facile à obtenir là où moins de séries sont lues.
 */
import { describe, expect, it } from 'vitest'
import type { Contexte, FicheIndex } from '@/lib/investir'
import { compteParAlerte, compteParCouverture, residuDe } from '@/lib/investir'

const LIGNE = (p: Partial<FicheIndex> = {}): FicheIndex => ({
  slug: 'societe',
  cik: 1,
  name: 'SOCIETE',
  currency: 'USD',
  core: true,
  famille: 'Pétrole et gaz',
  symbole: 'XOM',
  alertes: [],
  non_lus: [],
  n_lus: 7,
  ...p,
})

const RESIDUS: Contexte['residus'] = {
  '0|7': '0 alertes sur 7 contrôles lus (sur 7).',
  '2|6': '2 alertes sur 6 contrôles lus (sur 7).',
  '1|5': '1 alerte sur 5 contrôles lus (sur 7).',
}

describe('residuDe', () => {
  it('rend la phrase que le moteur a écrite pour ce couple', () => {
    const ligne = LIGNE({ alertes: ['pertes_recurrentes', 'dilution'], n_lus: 6 })

    expect(residuDe(ligne, RESIDUS)).toBe('2 alertes sur 6 contrôles lus (sur 7).')
  })

  it('accorde le singulier comme le moteur, pas comme le site', () => {
    // Le piège s'il fallait la composer ici : « 1 alertes ». Le moteur accorde
    // déjà, et c'est la seule raison pour laquelle la table existe.
    const ligne = LIGNE({ alertes: ['dilution'], n_lus: 5 })

    expect(residuDe(ligne, RESIDUS)).toBe('1 alerte sur 5 contrôles lus (sur 7).')
  })

  it('ne fabrique AUCUNE phrase quand le couple est absent de la table', () => {
    // Une phrase inventée ici serait indiscernable d'une phrase du moteur, et
    // se mettrait à diverger le jour où le moteur change de formulation. Rien
    // vaut mieux qu'une seconde implémentation.
    const ligne = LIGNE({ alertes: ['dilution', 'pertes_recurrentes'], n_lus: 4 })

    expect(residuDe(ligne, RESIDUS)).toBe('')
  })
})

describe('compteParAlerte', () => {
  it('compte les lignes par identifiant, le plus fréquent en tête', () => {
    const lignes = [
      LIGNE({ cik: 1, alertes: ['resultat_sous_niveau', 'dilution'] }),
      LIGNE({ cik: 2, alertes: ['resultat_sous_niveau'] }),
      LIGNE({ cik: 3, alertes: ['resultat_sous_niveau', 'ca_sous_niveau'] }),
      LIGNE({ cik: 4, alertes: [] }),
    ]

    expect(compteParAlerte(lignes)).toEqual([
      ['resultat_sous_niveau', 3],
      ['ca_sous_niveau', 1],
      ['dilution', 1],
    ])
  })

  it('ne rend aucune entrée pour une alerte que personne ne porte', () => {
    // Une puce sans ligne derrière se vide au clic sans que le lecteur sache
    // pourquoi. Les puces se dérivent des lignes, jamais d'une liste figée.
    expect(compteParAlerte([LIGNE({ alertes: [] })])).toEqual([])
  })

  it('départage deux alertes à égalité par leur identifiant, pas par hasard', () => {
    // Sans ordre stable, deux rendus successifs de la même liste montrent les
    // puces dans un ordre différent.
    const lignes = [LIGNE({ cik: 1, alertes: ['dilution', 'ca_sous_niveau'] })]

    expect(compteParAlerte(lignes).map(([id]) => id)).toEqual([
      'ca_sous_niveau',
      'dilution',
    ])
  })
})

describe('compteParCouverture', () => {
  it('compte les lignes par nombre de contrôles lus, le plus couvert en tête', () => {
    const lignes = [
      LIGNE({ cik: 1, n_lus: 6 }),
      LIGNE({ cik: 2, n_lus: 5 }),
      LIGNE({ cik: 3, n_lus: 6 }),
      LIGNE({ cik: 4, n_lus: 7 }),
    ]

    expect(compteParCouverture(lignes)).toEqual([
      [7, 1],
      [6, 2],
      [5, 1],
    ])
  })
})
