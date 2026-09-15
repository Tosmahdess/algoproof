import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import InvestirListe from '@/components/InvestirListe'
import type { Contexte, FicheIndex } from '@/lib/investir'

/**
 * La liste de 1 407 sociétés, après le retrait de la note.
 *
 * Elle coupait sur `grade` (« Comptes solides » / « À surveiller » /
 * « Fragile »). Le moteur n'émet plus que `lu` ou `non note`, et `fiche.refus`
 * refuse la publication des `non note` : le champ était devenu constant, donc
 * les trois puces auraient rendu zéro ligne chacune, le cartouche `undefined`,
 * et la mention « sans ancre » — testée par `anchor !== 'mesuree'` sur un champ
 * à `null` — se serait affichée sur les 1 407 lignes.
 *
 * Ce qui coupe maintenant : une puce par ALERTE, nommée par le fait, plus un
 * groupe « Couverture ». Et volontairement AUCUNE puce « sans alerte » — voir
 * le test qui porte ce nom.
 */

const CONTEXTE: Contexte = {
  mediane_annees: 20.6,
  societes_notees: 1407,
  plafond_annees: 40,
  residus: {
    '0|7': '0 alertes sur 7 contrôles lus (sur 7).',
    '1|6': '1 alerte sur 6 contrôles lus (sur 7).',
    '2|6': '2 alertes sur 6 contrôles lus (sur 7).',
    '0|5': '0 alertes sur 5 contrôles lus (sur 7).',
  },
  libelles: {
    pertes_recurrentes: 'pertes récurrentes (2 exercices sur 3)',
    dilution: "nombre d'actions en hausse de plus de 10 % en deux ans",
    ca_sous_niveau: "chiffre d'affaires sous son niveau d'il y a deux ans",
  },
  libelles_non_lus: {
    dette_nette: 'dette long terme',
    capitaux_propres: 'capitaux propres',
  },
}

const LIGNES: FicheIndex[] = [
  {
    slug: 'crowdstrike', cik: 1, name: 'CROWDSTRIKE HOLDINGS', currency: 'USD',
    core: true, famille: 'Logiciel', symbole: 'CRWD',
    alertes: ['pertes_recurrentes', 'dilution'], non_lus: ['dette_nette'], n_lus: 6,
  },
  {
    slug: 'exxon', cik: 2, name: 'EXXON MOBIL CORPORATION', currency: 'USD',
    core: true, famille: 'Pétrole et gaz', symbole: 'XOM',
    alertes: [], non_lus: [], n_lus: 7,
  },
  {
    slug: 'hasbro', cik: 3, name: 'HASBRO, INC.', currency: 'USD',
    core: false, famille: 'Logiciel', symbole: 'HAS',
    alertes: ['pertes_recurrentes'], non_lus: ['dette_nette'], n_lus: 6,
  },
  {
    slug: 'amazon', cik: 4, name: 'AMAZON.COM', currency: 'USD',
    core: true, famille: null, symbole: 'AMZN',
    alertes: [], non_lus: ['dette_nette', 'capitaux_propres'], n_lus: 5,
  },
]

const monter = () => render(<InvestirListe lignes={LIGNES} contexte={CONTEXTE} />)
const noms = () => screen.getAllByRole('listitem').map(li => li.textContent ?? '')

describe('InvestirListe', () => {
  it('rend une puce par alerte réellement portée, avec son effectif', () => {
    monter()

    // « pertes récurrentes » est portée par deux sociétés, « dilution » par une.
    expect(screen.getByRole('button', { name: /pertes récurrentes.*\(2\)/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /nombre d'actions en hausse.*\(1\)/ })).toBeTruthy()
  })

  it("ne propose pas de puce pour une alerte que personne ne porte", () => {
    // `ca_sous_niveau` a un libellé dans le contexte mais aucune ligne. Une
    // puce sans ligne derrière se vide au clic sans dire pourquoi.
    monter()

    expect(screen.queryByRole('button', { name: /chiffre d'affaires sous son niveau/ })).toBeNull()
  })

  it("n'offre AUCUNE puce « sans alerte », et c'est le point du crible", () => {
    // Deux raisons, et la seconde est la vraie. (1) « aucune alerte » est plus
    // facile à obtenir là où moins de séries sont lues : Amazon, à 5 contrôles
    // lus, remonterait avant Exxon qui en a 7. (2) Filtrer par ABSENCE de
    // signal rend une liste de sociétés que le site n'a rien trouvé à
    // reprocher — une recommandation implicite par sélection, que MAR
    // 3(1)(35) vise explicitement, y compris sans chiffre et sans adjectif.
    // Filtrer par alerte POSITIVE est de l'autre côté de la ligne : c'est une
    // phrase du dépôt, sourcée, réfutable, et défavorable.
    monter()

    for (const interdit of [/sans alerte/i, /aucune alerte/i, /comptes solides/i,
                            /à surveiller/i, /fragile/i]) {
      expect(screen.queryAllByRole('button', { name: interdit })).toEqual([])
    }
  })

  it('filtre les sociétés qui portent l\'alerte choisie', () => {
    monter()

    fireEvent.click(screen.getByRole('button', { name: /pertes récurrentes.*\(2\)/ }))

    expect(noms().length).toBe(2)
    expect(noms().join(' ')).toContain('CROWDSTRIKE')
    expect(noms().join(' ')).toContain('HASBRO')
  })

  it('montre le résidu du moteur sur chaque ligne, dénominateur compris', () => {
    monter()

    const crowd = screen.getAllByRole('listitem')[0]
    expect(within(crowd).getByText(/2 alertes sur 6 contrôles lus \(sur 7\)\./)).toBeTruthy()
  })

  it('affiche le zéro avec son dénominateur, jamais nu', () => {
    // Le zéro s'affiche — c'est un filtre « 0 » qui est refusé, pas la
    // mention. Collé à « sur 5 contrôles lus », il informe au lieu de flatter.
    monter()

    const amazon = screen.getAllByRole('listitem')[3]
    expect(within(amazon).getByText(/0 alertes sur 5 contrôles lus \(sur 7\)\./)).toBeTruthy()
  })

  it('nomme les contrôles non lus sur la ligne', () => {
    monter()

    const amazon = screen.getAllByRole('listitem')[3]
    expect(within(amazon).getByText(/Non lu.*dette long terme.*capitaux propres/)).toBeTruthy()
  })

  it('coupe par couverture, du plus lu au moins lu', () => {
    monter()

    fireEvent.click(screen.getByRole('button', { name: /5 contrôles lus \(1\)/ }))

    expect(noms().length).toBe(1)
    expect(noms()[0]).toContain('AMAZON')
  })

  it('garde le filtre par secteur et celui des grandes sociétés', () => {
    monter()

    fireEvent.click(screen.getByRole('button', { name: /Grandes sociétés/ }))

    expect(noms().length).toBe(3)                       // Hasbro sort
    expect(noms().join(' ')).not.toContain('HASBRO')
  })

  it("n'affiche plus jamais la mention « sans ancre »", () => {
    // Elle testait `anchor !== 'mesuree'` ; `anchor` vaut désormais `null`
    // partout, donc la mention serait vraie sur les 1 407 lignes. Une
    // affirmation fausse répétée 1 407 fois, pas un filtre inerte.
    monter()

    expect(screen.queryByText(/sans ancre/i)).toBeNull()
  })
})
