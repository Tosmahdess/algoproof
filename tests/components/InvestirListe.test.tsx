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

  it('folds the alert filters on every screen, closed at first render', () => {
    // Eight chips with long labels took 400 px on a phone before the list.
    // User decision 2026-09-19: a drilldown, on the computer too.
    const { container } = monter()

    const repli = container.querySelector('details')!
    expect(repli).toBeTruthy()
    expect(repli.open).toBe(false)
    expect(repli.querySelector('summary')!.textContent).toMatch(
      /Alerte relevée dans le dépôt · 2 motifs/,
    )
    expect(repli.contains(screen.getByRole('button', { name: /pertes récurrentes/ }))).toBe(true)
  })

  it('names the active alerts in clear in the folded summary, never a company count', () => {
    const { container } = monter()

    fireEvent.click(screen.getByRole('button', { name: /pertes récurrentes.*\(2\)/ }))

    const resume = container.querySelector('summary')!.textContent ?? ''
    expect(resume).toContain('pertes récurrentes (2 exercices sur 3)')
    // The chip carries « (2) » companies; the summary must not turn it into a tally.
    expect(resume).not.toMatch(/\(\d+\)/)
    expect(resume).not.toMatch(/sociétés?/)
  })

  it('does not close under the finger when the last chip is unticked', () => {
    // Uncontrolled on purpose: an `open` driven by the selection would fold
    // the block the moment its last chip is released.
    const { container } = monter()
    const repli = container.querySelector('details')!
    repli.open = true

    const puce = screen.getByRole('button', { name: /pertes récurrentes.*\(2\)/ })
    fireEvent.click(puce)
    fireEvent.click(puce)

    expect(repli.open).toBe(true)
  })

  it('leaves the coverage filter open: it is what shows how much was read', () => {
    const { container } = monter()

    const couverture = screen.getByRole('button', { name: /5 contrôles lus \(1\)/ })
    expect(container.querySelector('details')!.contains(couverture)).toBe(false)
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

    expect(screen.getByPlaceholderText('Chercher une société ou un ticker…')).toBeTruthy()
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
      el?.tagName === 'P' && el.textContent === '1 203 sociétés sur 1 203')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Afficher 50 de plus' })).toBeTruthy()
  })

  it('adds 50 rows per click and drops the button once everything is shown', () => {
    render(<InvestirListe lignes={beaucoup(120)} contexte={CONTEXTE} />)

    fireEvent.click(screen.getByRole('button', { name: 'Afficher 50 de plus' }))
    expect(screen.getAllByRole('listitem').length).toBe(100)

    fireEvent.click(screen.getByRole('button', { name: 'Afficher 50 de plus' }))
    expect(screen.getAllByRole('listitem').length).toBe(120)
    expect(screen.queryByRole('button', { name: 'Afficher 50 de plus' })).toBeNull()
  })

  it('shows no button when the list fits in one page', () => {
    render(<InvestirListe lignes={beaucoup(50)} contexte={CONTEXTE} />)

    expect(screen.getAllByRole('listitem').length).toBe(50)
    expect(screen.queryByRole('button', { name: 'Afficher 50 de plus' })).toBeNull()
  })

  it('goes back to the first page when a filter changes', () => {
    // Two pages open, then a filter that keeps 40 rows: the reader must not
    // land on an empty second page, nor keep 100 rows of a list that has 40.
    render(<InvestirListe lignes={beaucoup(120)} contexte={CONTEXTE} />)
    fireEvent.click(screen.getByRole('button', { name: 'Afficher 50 de plus' }))
    expect(screen.getAllByRole('listitem').length).toBe(100)

    fireEvent.click(screen.getByRole('button', { name: /pertes récurrentes.*\(40\)/ }))
    expect(screen.getAllByRole('listitem').length).toBe(40)
    expect(screen.getByText('40 sociétés sur 120')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /pertes récurrentes.*\(40\)/ }))
    expect(screen.getAllByRole('listitem').length).toBe(PAGE)
  })
})

// Lot 6, §3.3 / §6: every target is 40 px high at least (pills, the field,
// the select, the buttons), pills are `rounded`, fields and buttons `rounded-md`.
describe('InvestirListe, targets and radii', () => {
  it('gives every filter control a 40 px minimum height', () => {
    const { container } = render(<InvestirListe lignes={beaucoup(60)} contexte={CONTEXTE} />)

    const controles = [
      ...container.querySelectorAll('input, select, button'),
    ] as HTMLElement[]
    expect(controles.length).toBeGreaterThan(5)
    for (const c of controles) {
      expect(c.className, `${c.tagName} « ${c.textContent || c.getAttribute('aria-label')} »`)
        .toMatch(/\bmin-h-10\b/)
    }
  })

  it('rounds pills with `rounded`, the field, the select and the paging button with `rounded-md`', () => {
    const { container } = render(<InvestirListe lignes={beaucoup(60)} contexte={CONTEXTE} />)

    const champ = container.querySelector('input')!
    const select = container.querySelector('select')!
    const plus = screen.getByRole('button', { name: 'Afficher 50 de plus' })
    for (const el of [champ, select, plus]) expect(el.className).toMatch(/\brounded-md\b/)

    const pilules = screen.getAllByRole('button', { pressed: false })
      .filter(b => b !== plus)
    expect(pilules.length).toBeGreaterThan(2)
    for (const p of pilules) {
      expect(p.className).toMatch(/\brounded\b/)
      expect(p.className).not.toMatch(/\brounded-(?:md|lg)\b/)
    }
  })
})
