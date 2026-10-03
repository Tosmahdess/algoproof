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
// The list is in French alphabetical order since the refonte (audit 2026-10,
// n° 49): a row is found by its name, not by its rank in LIGNES.
const ligne = (nom: RegExp) => screen.getAllByRole('listitem').find(li => nom.test(li.textContent ?? ''))!
const liste = (name: RegExp) => screen.getByRole('combobox', { name }) as HTMLSelectElement
const options = (name: RegExp) => [...liste(name).options].map(o => o.textContent ?? '')
const choisir = (name: RegExp, value: string) => fireEvent.change(liste(name), { target: { value } })
const ALERTE = /Alerte relevée dans le dépôt/
const COUVERTURE = /Contrôles possibles/

describe('InvestirListe', () => {
  it('rend une option par alerte réellement portée, avec son effectif', () => {
    monter()

    // « pertes récurrentes » est portée par deux sociétés, « dilution » par une.
    // Refonte « registre » (2026-10-03): the engine label opens with a capital.
    expect(options(ALERTE).some(o => /^Pertes récurrentes.*\(2\)/.test(o))).toBe(true)
    expect(options(ALERTE).some(o => /^Nombre d'actions en hausse.*\(1\)/.test(o))).toBe(true)
  })

  it("ne propose pas de puce pour une alerte que personne ne porte", () => {
    // `ca_sous_niveau` a un libellé dans le contexte mais aucune ligne. Une
    // puce sans ligne derrière se vide au clic sans dire pourquoi.
    monter()

    expect(options(ALERTE).some(o => /chiffre d'affaires sous son niveau/i.test(o))).toBe(false)
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

    const tout = [...options(ALERTE), ...options(COUVERTURE),
                  ...screen.getAllByRole('button').map(b => b.textContent ?? '')]
    for (const interdit of [/sans alerte/i, /aucune alerte/i, /comptes solides/i,
                            /à surveiller/i, /fragile/i]) {
      expect(tout.filter(t => interdit.test(t))).toEqual([])
    }
  })

  it('filtre les sociétés qui portent l\'alerte choisie', () => {
    monter()

    choisir(ALERTE, 'pertes_recurrentes')

    expect(noms().length).toBe(2)
    expect(noms().join(' ')).toContain('CROWDSTRIKE')
    expect(noms().join(' ')).toContain('HASBRO')
  })

  it('montre le résidu du moteur sur chaque ligne, dénominateur compris', () => {
    monter()

    const crowd = ligne(/CROWDSTRIKE/)
    expect(within(crowd).getByText(/2 alertes sur 6 contrôles lus \(sur 7\)\./)).toBeTruthy()
  })

  it('affiche le zéro avec son dénominateur, jamais nu', () => {
    // Le zéro s'affiche — c'est un filtre « 0 » qui est refusé, pas la
    // mention. Collé à « sur 5 contrôles lus », il informe au lieu de flatter.
    monter()

    const amazon = ligne(/AMAZON/)
    expect(within(amazon).getByText(/0 alertes sur 5 contrôles lus \(sur 7\)\./)).toBeTruthy()
  })

  it('nomme les contrôles non lus sur la ligne', () => {
    monter()

    const amazon = ligne(/AMAZON/)
    expect(within(amazon).getByText(/Non lu.*dette long terme.*capitaux propres/)).toBeTruthy()
  })

  it('coupe par couverture, du plus lu au moins lu', () => {
    monter()

    expect(options(COUVERTURE).some(o => /^5 contrôles lus \(1\)$/.test(o))).toBe(true)
    choisir(COUVERTURE, '5')

    expect(noms().length).toBe(1)
    expect(noms()[0]).toContain('AMAZON')
  })

  it('garde le filtre par secteur et celui des grandes sociétés', () => {
    monter()

    fireEvent.click(screen.getByRole('button', { name: /Grandes sociétés/ }))

    expect(noms().length).toBe(3)                       // Hasbro sort
    expect(noms().join(' ')).not.toContain('HASBRO')
  })

  // 2026-09-30 (user, on a phone): the search was lost among the filters, and
  // « Alerte relevée dans le dépôt » did not look clickable. The search stands
  // alone on its line; the filters are lists behind ONE « Filtres » button on a
  // phone (always shown from lg), and the whole bar sticks under the nav.
  it('keeps the search and the filters in one bar stuck under the nav', () => {
    monter()

    const barre = screen.getByTestId('investir-filtres')
    expect(barre.className).toMatch(/\bsticky\b/)
    expect(barre.className).toContain('top-[var(--nav-h)]')
    expect(barre.contains(screen.getByRole('searchbox', { name: /Chercher une société/ }))).toBe(true)
    expect(barre.contains(liste(ALERTE))).toBe(true)
  })

  it('folds the lists behind one « Filtres » button on a phone, closed at first', () => {
    monter()

    const bouton = screen.getByRole('button', { name: /^Filtres/ })
    expect(bouton.getAttribute('aria-expanded')).toBe('false')
    expect(bouton.className).toContain('lg:hidden')
    const panneau = document.getElementById(bouton.getAttribute('aria-controls')!)!
    expect(panneau.className).toMatch(/(^|\s)hidden(\s|$)/)
    expect(panneau.className).toContain('lg:block')
    expect(panneau.contains(liste(ALERTE))).toBe(true)
    fireEvent.click(bouton)
    expect(bouton.getAttribute('aria-expanded')).toBe('true')
    expect(panneau.className).not.toMatch(/(^|\s)hidden(\s|$)/)
  })

  it('counts the active filters on the button, never companies', () => {
    monter()

    choisir(ALERTE, 'pertes_recurrentes')
    choisir(COUVERTURE, '6')
    const bouton = screen.getByRole('button', { name: /^Filtres/ })
    expect(bouton.textContent).toMatch(/Filtres\s*2/)
    fireEvent.click(screen.getByRole('button', { name: 'Tout effacer' }))
    expect(liste(ALERTE).value).toBe('')
    expect(liste(COUVERTURE).value).toBe('')
  })

  it('does not count the search as a filter', () => {
    monter()

    fireEvent.change(screen.getByRole('searchbox', { name: /Chercher une société/ }),
                     { target: { value: 'amazon' } })
    expect(screen.getByRole('button', { name: /^Filtres/ }).textContent).not.toMatch(/\d/)
  })

  it("n'affiche plus jamais la mention « sans ancre »", () => {
    // Elle testait `anchor !== 'mesuree'` ; `anchor` vaut désormais `null`
    // partout, donc la mention serait vraie sur les 1 407 lignes. Une
    // affirmation fausse répétée 1 407 fois, pas un filtre inerte.
    monter()

    expect(screen.queryByText(/sans ancre/i)).toBeNull()
  })

  // Lot 6 (2026-09-25, conception §5.5, C3.1 of the arbitration): the search
  // indexes the ticker too. FicheIndex carried `symbole` all along; the filter
  // read `name` only, so « AAPL » found nothing while « Apple » found two.
  it('finds a company by its ticker, whatever the case', () => {
    monter()

    fireEvent.change(screen.getByRole('searchbox', { name: /Chercher une société/ }),
                     { target: { value: 'crwd' } })

    expect(noms().length).toBe(1)
    expect(noms()[0]).toContain('CROWDSTRIKE')
  })

  it('still finds a company by its name', () => {
    monter()

    fireEvent.change(screen.getByRole('searchbox', { name: /Chercher une société/ }),
                     { target: { value: 'amazon' } })

    expect(noms().length).toBe(1)
    expect(noms()[0]).toContain('AMAZON')
  })

  it('says in the field that a ticker works too', () => {
    monter()

    expect(screen.getByPlaceholderText('Société ou ticker…')).toBeTruthy()
  })
})

// Lot 6: the list is paged on the client, 50 rows at a time. The page stays
// force-static and the index still travels whole; only the DOM is bounded
// (138 313 px of page on a computer before, 148 723 px on a phone).
const PAGE = 50

function beaucoup(n: number): FicheIndex[] {
  return Array.from({ length: n }, (_, i) => ({
    slug: `societe-${i}`, cik: 1000 + i, name: `Société ${String(i).padStart(4, '0')}`,
    currency: 'USD', core: i % 2 === 0, famille: 'Logiciel', symbole: `S${i}`,
    alertes: i % 3 === 0 ? ['pertes_recurrentes'] : [], non_lus: [], n_lus: 7,
  }))
}

describe('InvestirListe, pagination', () => {
  it('renders the first 50 rows only, and says how many there are in all', () => {
    render(<InvestirListe lignes={beaucoup(1203)} contexte={CONTEXTE} />)

    expect(screen.getAllByRole('listitem').length).toBe(PAGE)
    // French figures: a narrow no-break space as the thousands separator. A
    // function matcher, because the library's normaliser folds U+202F into a
    // plain space before comparing with a string.
    expect(screen.getByText((_, el) =>
      el?.tagName === 'P' && el.textContent === '1 203 sociétés sur 1 203')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Voir les 50 suivantes' })).toBeTruthy()
  })

  it('adds 50 rows per click and drops the button once everything is shown', () => {
    render(<InvestirListe lignes={beaucoup(120)} contexte={CONTEXTE} />)

    fireEvent.click(screen.getByRole('button', { name: 'Voir les 50 suivantes' }))
    expect(screen.getAllByRole('listitem').length).toBe(100)

    // The button names what it adds: 20 rows are left (the fleet's wording).
    fireEvent.click(screen.getByRole('button', { name: 'Voir les 20 suivantes' }))
    expect(screen.getAllByRole('listitem').length).toBe(120)
    expect(screen.queryByRole('button', { name: /^Voir les/ })).toBeNull()
  })

  it('shows no button when the list fits in one page', () => {
    render(<InvestirListe lignes={beaucoup(50)} contexte={CONTEXTE} />)

    expect(screen.getAllByRole('listitem').length).toBe(50)
    expect(screen.queryByRole('button', { name: 'Voir les 50 suivantes' })).toBeNull()
  })

  it('goes back to the first page when a filter changes', () => {
    // Two pages open, then a filter that keeps 40 rows: the reader must not
    // land on an empty second page, nor keep 100 rows of a list that has 40.
    render(<InvestirListe lignes={beaucoup(120)} contexte={CONTEXTE} />)
    fireEvent.click(screen.getByRole('button', { name: 'Voir les 50 suivantes' }))
    expect(screen.getAllByRole('listitem').length).toBe(100)

    choisir(ALERTE, 'pertes_recurrentes')
    expect(screen.getAllByRole('listitem').length).toBe(40)
    expect(screen.getByText('40 sociétés sur 120')).toBeTruthy()

    choisir(ALERTE, '')
    expect(screen.getAllByRole('listitem').length).toBe(PAGE)
  })
})

// Lot 6, §3.3 / §6: every target is 40 px high at least (pills, the field,
// the select, the buttons), pills are `rounded`, fields and buttons `rounded-md`.
// Refonte « registre » (2026-10-03): 44 px, the site's target (DESIGN.md, Layout).
describe('InvestirListe, targets and radii', () => {
  it('gives every filter control a 44 px minimum height', () => {
    const { container } = render(<InvestirListe lignes={beaucoup(60)} contexte={CONTEXTE} />)

    const controles = [
      ...container.querySelectorAll('input, select, button'),
    ] as HTMLElement[]
    expect(controles.length).toBeGreaterThan(5)
    for (const c of controles) {
      expect(c.className, `${c.tagName} « ${c.textContent || c.getAttribute('aria-label')} »`)
        .toMatch(/\bmin-h-11\b/)
    }
  })

  it('rounds the field, the lists, the buttons with `rounded-md`', () => {
    const { container } = render(<InvestirListe lignes={beaucoup(60)} contexte={CONTEXTE} />)

    const controles = [...container.querySelectorAll('input, select, button')] as HTMLElement[]
    for (const c of controles) expect(c.className, c.tagName).toMatch(/\brounded-md\b/)
  })

  it('writes the field and the lists at 16 px on a phone, so iOS does not zoom on focus', () => {
    const { container } = render(<InvestirListe lignes={beaucoup(60)} contexte={CONTEXTE} />)

    for (const c of container.querySelectorAll('input, select')) {
      expect(c.className).toMatch(/(^|\s)text-base(\s|$)/)
    }
  })
})

// Refonte « registre » (2026-10-03), audit 2026-10, n° 49, 13 and 20.
describe('InvestirListe, the register', () => {
  it('lists the companies in French alphabetical order, not in ASCII order', () => {
    const lignes = ['lululemon athletica inc.', 'AZZ INC.', 'AbbVie Inc.'].map((name, i) => ({
      ...LIGNES[1], slug: `s${i}`, cik: 100 + i, name,
    }))
    render(<InvestirListe lignes={lignes} contexte={CONTEXTE} />)

    expect(screen.getAllByRole('link').map(a => a.textContent)).toEqual([
      'AbbVie Inc.', 'AZZ INC.', 'lululemon athletica inc.',
    ])
  })

  it('makes the name the row link, never the whole row', () => {
    monter()

    const crowd = screen.getAllByRole('listitem').find(li => /CROWDSTRIKE/.test(li.textContent ?? ''))!
    const liens = within(crowd).getAllByRole('link')
    expect(liens.map(a => a.textContent)).toEqual(['CROWDSTRIKE HOLDINGS'])
    expect(liens[0].getAttribute('href')).toBe('/investir/crowdstrike')
  })

  it('finds by name whatever the accents', () => {
    const lignes = [{ ...LIGNES[1], name: 'Hermès International', slug: 'hermes', cik: 9 }, LIGNES[0]]
    render(<InvestirListe lignes={lignes} contexte={CONTEXTE} />)

    fireEvent.change(screen.getByRole('searchbox', { name: /Chercher une société/ }), { target: { value: 'hermes' } })
    expect(noms()).toHaveLength(1)
    expect(noms()[0]).toContain('Hermès')
  })
})

describe('InvestirListe, search beyond the companies I read (n° 13)', () => {
  const DEHORS = [
    { slug: 'lvmh', name: 'LVMH', ticker: 'EPA:MC' },
    { slug: 'visa', name: 'Visa', ticker: 'NYSE:V' },
  ]
  const monterAvecDehors = () => render(<InvestirListe lignes={LIGNES} contexte={CONTEXTE} horsPerimetre={DEHORS} />)
  const chercher = (v: string) => fireEvent.change(screen.getByRole('searchbox', { name: /Chercher une société/ }), { target: { value: v } })

  it('shows nothing out of scope while nothing is searched', () => {
    monterAvecDehors()
    expect(screen.queryByTestId('investir-hors-perimetre-resultats')).toBeNull()
  })

  it('finds an out-of-scope company, says it is out of scope, and links its fiche', () => {
    monterAvecDehors()
    chercher('lvmh')

    const bloc = screen.getByTestId('investir-hors-perimetre-resultats')
    expect(bloc.textContent).toMatch(/hors de mon périmètre/)
    expect(within(bloc).getByRole('link', { name: 'LVMH' }).getAttribute('href')).toBe('/investir/lvmh')
    // The empty state names the search, not a filter nobody set.
    expect(screen.getByRole('status').textContent).toMatch(/ne correspond à « lvmh »/)
    expect(screen.getByRole('status').textContent).not.toMatch(/filtre/)
  })

  it('never claims they file nothing with the regulator (n° 14: false for several of them)', () => {
    monterAvecDehors()
    chercher('visa')
    expect(screen.getByTestId('investir-hors-perimetre-resultats').textContent).not.toMatch(/ne déposent|déposent pas/)
  })
})

describe('InvestirListe, empty state by cause (n° 13)', () => {
  it('offers to clear the search when the search alone empties the list, and clears it', () => {
    monter()
    const champ = screen.getByRole('searchbox', { name: /Chercher une société/ }) as HTMLInputElement
    fireEvent.change(champ, { target: { value: 'zzzz' } })

    const vide = screen.getByRole('status')
    expect(vide.textContent).toMatch(/Aucune des 4 sociétés que je lis ne correspond à « zzzz »/)
    expect(within(vide).queryByRole('button', { name: 'Retirer les filtres' })).toBeNull()
    fireEvent.click(within(vide).getByRole('button', { name: 'Effacer la recherche' }))
    expect(champ.value).toBe('')
    expect(noms()).toHaveLength(4)
  })

  it('offers to remove the filters when the filters alone empty the list, with one reset only', () => {
    monter()
    choisir(ALERTE, 'dilution')
    choisir(COUVERTURE, '5')

    const vide = screen.getByRole('status')
    expect(vide.textContent).toMatch(/cette combinaison de filtres/)
    expect(within(vide).queryByRole('button', { name: 'Effacer la recherche' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Tout effacer' })).toBeNull()
    fireEvent.click(within(vide).getByRole('button', { name: 'Retirer les filtres' }))
    expect(noms()).toHaveLength(4)
  })
})

describe('InvestirListe, paging and focus', () => {
  it('moves the focus to the first new row after « Voir les 50 suivantes »', () => {
    render(<InvestirListe lignes={beaucoup(120)} contexte={CONTEXTE} />)
    fireEvent.click(screen.getByRole('button', { name: 'Voir les 50 suivantes' }))

    expect(document.activeElement?.textContent).toBe(screen.getAllByRole('listitem')[50].querySelector('a')!.textContent)
  })

  it('says « Voir les 20 suivantes » when fewer than 50 remain', () => {
    render(<InvestirListe lignes={beaucoup(120)} contexte={CONTEXTE} />)
    fireEvent.click(screen.getByRole('button', { name: 'Voir les 50 suivantes' }))
    expect(screen.getByRole('button', { name: 'Voir les 20 suivantes' })).toBeTruthy()
  })
})
