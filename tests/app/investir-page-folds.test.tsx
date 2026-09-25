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
      expect(bouton.className).toContain('sm:hidden')
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
    // Nothing folded stands between the title and the field.
    for (const titre of FOLDED) {
      expect(precede(champ, screen.getByRole('button', { name: titre }))).toBe(true)
    }
  })

  it('seats the three counts beside the title on a computer (7/5 grid)', () => {
    monter()

    const h1 = screen.getByRole('heading', { level: 1 })
    const tuiles = screen.getByText('Sociétés lues')
    expect(h1.closest('.lg\\:col-span-7')).not.toBeNull()
    expect(tuiles.closest('.lg\\:col-span-5')).not.toBeNull()
    expect(tuiles.closest('.lg\\:grid-cols-12')).toBe(h1.closest('.lg\\:grid-cols-12'))
  })

  it('writes the counts in French figures, in a rounded-lg tile', () => {
    monter()

    // 1 203 rows in this render (see the mock): the thousands separator is
    // the narrow no-break space, never « 1203 » nor « 1,203 ».
    const tuile = screen.getByText('Sociétés lues').closest('div')!
    expect(tuile.className).toMatch(/\brounded-lg\b/)
    expect(tuile.textContent).toBe('1 203Sociétés lues')
    // Function matcher: the library's normaliser folds U+202F into a plain space.
    expect(screen.getByText((_, el) =>
      el?.tagName === 'P' && el.textContent === '1 203 sociétés sur 1 203')).toBeTruthy()
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
    const plus = screen.getByRole('button', { name: 'Afficher 50 de plus' })
    expect(precede(champ, creux)).toBe(true)
    expect(precede(derniereLigne, creux)).toBe(true)
    expect(precede(plus, creux)).toBe(true)
    // Its caveat travels with it.
    expect(creux.parentElement!.textContent).toContain('depuis le plus haut des six derniers mois')
  })

  it('closes the page with the four folds, in this order, after the dips', async () => {
    await monterAvecCreux()

    const creux = screen.getByRole('heading', {
      name: 'Ce que les cours disent, et que mes contrôles ne lisent pas',
    })
    const ordre = [
      /Les mots employés dans les fiches/,
      /sociétés que je ne lis pas/,
      /Ce que je contrôle, et ce que je ne sais pas/,
      /Ce que cette liste ne contient pas, et pourquoi/,
    ].map(t => screen.getByRole('button', { name: t }))

    expect(precede(creux, ordre[0])).toBe(true)
    for (let i = 1; i < ordre.length; i++) expect(precede(ordre[i - 1], ordre[i])).toBe(true)
  })
})
