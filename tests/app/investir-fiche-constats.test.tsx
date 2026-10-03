// tests/app/investir-fiche-constats.test.tsx
//
// Refonte « Le registre des décisions », pages Sociétés (2026-10-03). A
// company fiche opens on ONE framed panel, the reading of the seven controls,
// each with its state (audit 2026-10, n° 53), under « Des lectures, pas des
// conseils » (n° 52). Never a stamp: no status colour, the same title on every
// fiche.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('unexpected notFound') },
}))
vi.mock('@/components/CoursTradingView', () => ({ CoursTradingView: () => null }))

import FicheInvestir from '@/app/investir/[slug]/page'
import { ficheParSlug } from '@/lib/investir'

function precede(a: Element, b: Element) {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
}

async function renderFiche(slug: string) {
  const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ entitlement: 'guest' }) }))
  vi.stubGlobal('fetch', fetchMock)
  const view = render(await FicheInvestir({ params: Promise.resolve({ slug }) }))
  await waitFor(() => expect(fetchMock).toHaveBeenCalled())
  await act(async () => {})
  return view
}

afterEach(() => vi.unstubAllGlobals())

describe('company fiche, the reading panel', () => {
  it('lists the seven controls of Crown Castle with their state, alerts with a capital', async () => {
    // Crown Castle: 5 alerts on 7 controls read (the audit's example).
    expect(ficheParSlug('crown-castle-inc')!.alertes).toHaveLength(5)
    await renderFiche('crown-castle-inc')

    const panneau = screen.getByTestId('constats')
    const lignes = within(panneau).getAllByRole('listitem')
    expect(lignes).toHaveLength(7)
    expect(lignes.map(l => l.getAttribute('data-etat'))).toEqual([
      'alerte', 'alerte', 'alerte', 'sans-alerte', 'alerte', 'alerte', 'sans-alerte',
    ])
    expect(lignes[0].textContent).toMatch(/^Pertes.*AlertePerte sur un exercice\.$/)
    expect(lignes[3].textContent).toMatch(/^Dilution.*Sans alerte$/)
    // The engine sentence, without the redundant « (sur 7) » (n° 80).
    expect(screen.getByTestId('constats-resume').textContent).toBe('5 alertes sur 7 contrôles lus.')
  })

  it('says which controls were not read, and why', async () => {
    const slug = 'aaon-inc'
    expect(ficheParSlug(slug)!.non_lus).toEqual(['dette_nette', 'lecture_tresorerie'])
    await renderFiche(slug)

    const nonLus = within(screen.getByTestId('constats')).getAllByRole('listitem')
      .filter(l => l.getAttribute('data-etat') === 'non-lu')
    expect(nonLus.map(l => l.textContent)).toEqual([
      expect.stringMatching(/^Dette long terme.*Non luAucun poste de dette à long terme dans ce dépôt\.$/),
      expect.stringMatching(/^Trésorerie.*Non luTrésorerie ou dette long terme absente de ce dépôt\.$/),
    ])
  })

  it('is no stamp: no status colour on the panel, whatever it counts', async () => {
    const { container } = await renderFiche('crown-castle-inc')
    const panneau = screen.getByTestId('constats')
    expect(panneau.outerHTML).not.toMatch(/text-(negative|severe|warning|brand|positive)|border-(negative|warning)/)
    expect(screen.getByRole('heading', { level: 2, name: 'Constats de lecture' })).toBeTruthy()
    // The one framed panel of the fiche.
    expect(container.querySelectorAll('.rounded-lg')).toHaveLength(1)
  })

  it('reads in order: title, « Des lectures, pas des conseils », the panel, the figures, the accounts, the source', async () => {
    await renderFiche('crown-castle-inc')

    const ordre = [
      screen.getByRole('heading', { level: 1 }),
      screen.getByTestId('des-lectures'),
      screen.getByTestId('constats'),
      screen.getByTestId('fiche-chiffres'),
      screen.getByRole('heading', { level: 2, name: 'Les comptes' }),
      screen.getByRole('heading', { level: 2, name: 'Refais-le toi-même' }),
    ]
    for (let i = 1; i < ordre.length; i++) expect(precede(ordre[i - 1], ordre[i])).toBe(true)
  })

  it('separates the sector, the standards and the currency (n° 80)', async () => {
    await renderFiche('crown-castle-inc')
    expect(screen.getByTestId('fiche-meta').textContent).toBe('NYSE:CCI · Les foncières cotées · comptes US GAAP · USD')
  })

  it('opens the filing on sec.gov from « Refais-le toi-même »', async () => {
    await renderFiche('crown-castle-inc')
    expect(screen.getByRole('link', { name: /Ouvrir ce dépôt sur sec\.gov/ }).getAttribute('href'))
      .toBe('https://www.sec.gov/Archives/edgar/data/1051470/000105147026000016/')
  })

  it('gives the way back to the companies', async () => {
    await renderFiche('crown-castle-inc')
    const fil = screen.getByRole('navigation', { name: 'Fil d’Ariane' })
    expect(within(fil).getByRole('link', { name: 'Sociétés' }).getAttribute('href')).toBe('/investir')
  })
})

describe('company fiche without an alert', () => {
  it('lists seven controls read without an alert, with its count', async () => {
    const slug = 'adobe-inc'
    expect(ficheParSlug(slug)!.alertes).toEqual([])
    await renderFiche(slug)

    const lignes = within(screen.getByTestId('constats')).getAllByRole('listitem')
    expect(lignes.every(l => l.getAttribute('data-etat') === 'sans-alerte')).toBe(true)
    expect(screen.getByTestId('constats-resume').textContent).toBe('Aucune alerte sur 7 contrôles lus.')
  })
})

describe('out-of-scope fiche', () => {
  it('says first, in its panel, that I do not read its accounts, under « Des lectures, pas des conseils »', async () => {
    await renderFiche('lvmh')
    const panneau = screen.getByTestId('constats')
    expect(panneau.textContent).toMatch(/Je ne lis pas les comptes de cette société/)
    expect(precede(screen.getByTestId('des-lectures'), panneau)).toBe(true)
    expect(panneau.className).not.toMatch(/warning/)
  })
})
