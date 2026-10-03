// tests/app/investir-page-folds.test.tsx
//
// 2026-09-19: on a 390 px phone the company search came after ~3 000 px of
// explanation. The long explanatory blocks now fold on a phone and stay as
// they were on a computer (see Repli); the hero, the three counts and the
// recent dips stay open.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import InvestirPage from '@/app/investir/page'

// The real index has 1 406 rows: one render took 13-18 s in jsdom while the
// list rendered them all. Since lot 6 only 50 rows reach the DOM, so 1 203
// real rows are cheap, and a four-figure count proves the French format.
vi.mock('@/lib/investir', async importOriginal => {
  const reel = await importOriginal<typeof import('@/lib/investir')>()
  return { ...reel, listeInvestir: () => reel.listeInvestir().slice(0, 1203) }
})

afterEach(() => vi.unstubAllGlobals())

function monter() {
  // CreuxDachat fetches the dips client-side; nothing is served here.
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => [] })))
  return render(<InvestirPage />)
}

const FOLDED = [
  /Les mots employés dans les fiches/,
  /Ce que je contrôle, et ce que je ne sais pas/,
  /sociétés que je ne lis pas/,
  /Ce que cette liste ne contient pas, et pourquoi/,
]

describe('/investir, long blocks fold on a phone', () => {
  it('turns each long explanatory heading into a closed disclosure button', () => {
    monter()

    for (const titre of FOLDED) {
      const bouton = screen.getByRole('button', { name: titre })
      expect(bouton.getAttribute('aria-expanded')).toBe('false')
      // The method folds on every screen since the refonte « registre »
      // (2026-10-03): it sits between the counts and the list on a computer
      // too, one line, so the DOM order is the visual order (n° 50).
      if (String(titre).includes('Ce que je contrôle')) expect(bouton.className).not.toContain('sm:hidden')
      else expect(bouton.className).toContain('sm:hidden')
    }
  })

  it('does not fold the hero, the counts, or the company list', () => {
    monter()

    // Present first: an absence check alone is green on an empty page.
    expect(screen.getByRole('heading', { level: 1, name: /Je lis le dernier rapport annuel/ })).toBeTruthy()
    expect(screen.getByText('Sociétés lues')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'Les sociétés' })).toBeTruthy()

    expect(screen.queryByRole('button', { name: /Je lis le dernier rapport annuel/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Sociétés lues/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Les sociétés$/ })).toBeNull()
  })

  it('keeps the vocabulary anchor on its heading', () => {
    monter()

    const titre = document.getElementById('mots-investir')!
    expect(titre.tagName).toBe('H2')
    expect(titre.textContent).toContain('Les mots employés dans les fiches')
  })

  it('keeps the companies anchor, and no longer needs a jump link to reach it', () => {
    // Lot 6: the search sits right under the title, so the « Aller aux
    // sociétés ↓ » link would jump to where the reader already is. The anchor
    // itself stays: links from outside aim at /investir#societes.
    monter()

    expect(document.getElementById('societes')!.textContent).toBe('Les sociétés')
    expect(screen.queryByRole('link', { name: /Aller aux sociétés/ })).toBeNull()
  })

  it('lists the seven controls as wrapping items, not a clipped <pre>', () => {
    // The <pre> clipped every line on a phone (« 2 exercices en perte sur 3, ou un s… »).
    const { container } = monter()

    expect(container.querySelector('pre')).toBeNull()
    const liste = screen.getByRole('list', { name: /Les sept contrôles/ })
    expect(within(liste).getAllByRole('listitem').length).toBe(7)
    expect(liste.textContent).toContain('2 exercices en perte sur 3, ou un seul')
    expect(liste.textContent).toContain('double de la médiane de son secteur')
  })
})

// Lot 6 (2026-09-25, conception §5.5): the page becomes a search product. The
// search and its facets sit right under the title (they were 2 326 px down on
// a computer, 1 764 on a phone), the three counts sit beside the title, the
// price-based dips go under the list under a title that no longer contradicts
// « je ne lis aucun cours » in the same screen, and the folds close the page.
function precede(a: Element, b: Element) {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
}

async function monterAvecCreux() {
  // One dip flagged today: without it CreuxDachat renders nothing, and an
  // order check on an absent block is green for free.
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => [{
      ticker: 'ZZZZ', asset_name: 'Société Repérée', drawdown_pct: -31,
      signal_level: 'major', alerted_at: new Date().toISOString(),
    }],
  })))
  const vue = render(<InvestirPage />)
  await screen.findByText('Société Repérée')
  return vue
}

describe('/investir as a search product (lot 6)', () => {
  it('puts the search field right after the title and the short intro', () => {
    monter()

    const h1 = screen.getByRole('heading', { level: 1 })
    const champ = screen.getByRole('searchbox', { name: /Chercher une société/ })
    const tuiles = screen.getByText('Sociétés lues')
    expect(precede(h1, champ)).toBe(true)
    expect(precede(tuiles, champ)).toBe(true)
    // One folded line only stands between the title and the field: the method
    // (user, 2026-09-30: on a phone nobody knew what « les contrôles » were).
    for (const titre of FOLDED.filter(t => !String(t).includes('Ce que je contrôle'))) {
      expect(precede(champ, screen.getByRole('button', { name: titre }))).toBe(true)
    }
  })

  // Refonte « registre » (2026-10-03), audit 2026-10, n° 50: the method was
  // moved to the end on a computer by `sm:order-last`, so the DOM order and
  // the visual order differed (WCAG 1.3.2) and the intro pointed at a block
  // with no link. It now stays where it is read, folded on every screen, and
  // the intro links to it.
  it('keeps the method next to the intro on every screen, folded, linked from the intro, in DOM order', () => {
    const { container } = monter()

    const h1 = screen.getByRole('heading', { level: 1 })
    const champ = screen.getByRole('searchbox', { name: /Chercher une société/ })
    const methode = screen.getByRole('button', { name: /Ce que je contrôle, et ce que je ne sais pas/ })
    expect(precede(h1, methode)).toBe(true)
    expect(precede(methode, champ)).toBe(true)
    expect(methode.getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByRole('link', { name: 'Les sept contrôles et leurs limites' }).getAttribute('href')).toBe('#methode')
    expect(document.getElementById('methode')!.tagName).toBe('H2')
    // No block is moved by CSS order any more.
    expect(container.innerHTML).not.toMatch(/(^|[\s":])order-(last|first|\d)/)
  })

  // Refonte « registre »: the fleet's grammar, three counts between two
  // rules, no tile, no card (they were rounded-lg tiles beside the title).
  it('sets the three counts between two rules, after the intro and before the method', () => {
    monter()

    const chiffres = screen.getByTestId('investir-chiffres')
    expect(chiffres.tagName).toBe('DL')
    expect(chiffres.className).toContain('border-y')
    expect(chiffres.innerHTML).not.toMatch(/rounded|bg-card/)
    expect(precede(screen.getByRole('heading', { level: 1 }), chiffres)).toBe(true)
    expect(precede(chiffres, screen.getByRole('button', { name: /Ce que je contrôle/ }))).toBe(true)
  })

  it('writes the counts in French figures, the label before the figure', () => {
    monter()

    // 1 203 rows in this render (see the mock): the thousands separator is
    // a no-break space, never « 1203 » nor « 1,203 ».
    const cellule = screen.getByText('Sociétés lues').closest('div')!
    expect(cellule.textContent).toBe('Sociétés lues1 203')
    // Function matcher: the library's normaliser folds U+202F into a plain space.
    expect(screen.getByText((_, el) =>
      el?.tagName === 'P' && el.textContent === '1 203 sociétés sur 1 203')).toBeTruthy()
  })

  // Audit 2026-10, n° 52: « Des lectures, pas des conseils » was on no page.
  it('says « Des lectures, pas des conseils » right under the title, before any figure', () => {
    monter()

    const phrase = screen.getByTestId('des-lectures')
    expect(phrase.textContent).toMatch(/^Des lectures, pas des conseils\./)
    expect(precede(screen.getByRole('heading', { level: 1 }), phrase)).toBe(true)
    expect(precede(phrase, screen.getByTestId('investir-chiffres'))).toBe(true)
  })

  it('dates the last computation with the medium date', () => {
    monter()

    expect(screen.getByText(/Dernier calcul le 7 sept\. 2026/)).toBeTruthy()
  })

  it('moves the price dips under the list, under a title that names their limit', async () => {
    await monterAvecCreux()

    const creux = screen.getByRole('heading', {
      name: 'Ce que les cours disent, et que mes contrôles ne lisent pas',
    })
    expect(screen.queryByText('Creux repérés récemment')).toBeNull()

    const champ = screen.getByRole('searchbox', { name: /Chercher une société/ })
    // The last row of the companies list and its paging button both come first.
    const liste = document.getElementById('societes')!.closest('section')!
    const derniereLigne = [...liste.querySelectorAll('li')].at(-1)!
    const plus = screen.getByRole('button', { name: 'Voir les 50 suivantes' })
    expect(precede(champ, creux)).toBe(true)
    expect(precede(derniereLigne, creux)).toBe(true)
    expect(precede(plus, creux)).toBe(true)
    // Its caveat travels with it.
    expect(creux.parentElement!.textContent).toContain('depuis le plus haut des six derniers mois')
  })

  it('closes the page with the other three folds, in this order, after the dips', async () => {
    await monterAvecCreux()

    const creux = screen.getByRole('heading', {
      name: 'Ce que les cours disent, et que mes contrôles ne lisent pas',
    })
    const ordre = [
      /Les mots employés dans les fiches/,
      /sociétés que je ne lis pas/,
      /Ce que cette liste ne contient pas, et pourquoi/,
    ].map(t => screen.getByRole('button', { name: t }))

    expect(precede(creux, ordre[0])).toBe(true)
    for (let i = 1; i < ordre.length; i++) expect(precede(ordre[i - 1], ordre[i])).toBe(true)
  })
})
