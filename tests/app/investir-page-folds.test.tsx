// tests/app/investir-page-folds.test.tsx
//
// 2026-09-19: on a 390 px phone the company search came after ~3 000 px of
// explanation. The long explanatory blocks now fold on a phone and stay as
// they were on a computer (see Repli); the hero, the three counts and the
// recent dips stay open.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import InvestirPage from '@/app/investir/page'

// The real index has 1 406 rows: one render takes 13-18 s in jsdom. The folds
// do not depend on the list, so twenty real rows are enough.
vi.mock('@/lib/investir', async importOriginal => {
  const reel = await importOriginal<typeof import('@/lib/investir')>()
  return { ...reel, listeInvestir: () => reel.listeInvestir().slice(0, 20) }
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

  it('offers a jump to the companies from the hero', () => {
    monter()

    const lien = screen.getByRole('link', { name: /Aller aux sociétés/ })
    expect(lien.getAttribute('href')).toBe('#societes')
    expect(document.getElementById('societes')!.textContent).toBe('Les sociétés')
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
