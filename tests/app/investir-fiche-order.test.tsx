// tests/app/investir-fiche-order.test.tsx
//
// Lot 6 (2026-09-25, conception §5.5 and §1 bis): on a company page the free
// proof, « Les comptes en détail », comes BEFORE the paid reading, « Ce que
// j'en retiens », and the price widget is the last block. RecitInvestir is
// moved, not changed: its route and its entitlement stay as they are, and the
// identity block « Qui écrit ceci » keeps closing the page.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('unexpected notFound') },
}))
vi.mock('@/components/CoursTradingView', () => ({ CoursTradingView: () => null }))

import FicheInvestir from '@/app/investir/[slug]/page'
import { ficheParSlug } from '@/lib/investir'

function precede(a: Element, b: Element) {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
}

async function renderFiche(slug: string, payload: unknown) {
  const fetchMock = vi.fn(async () => ({ ok: true, json: async () => payload }))
  vi.stubGlobal('fetch', fetchMock)
  const view = render(await FicheInvestir({ params: Promise.resolve({ slug }) }))
  await waitFor(() => expect(fetchMock).toHaveBeenCalled())
  await act(async () => {})
  return view
}

afterEach(() => vi.unstubAllGlobals())

describe('/investir/[slug], order of the blocks (lot 6)', () => {
  // A company with a ticker, detailed accounts and a source block: every
  // block whose order is pinned below is present on this page.
  const slug = 'apple-inc'
  const fiche = ficheParSlug(slug)!

  it('renders a company that carries every block this order concerns', () => {
    expect(fiche.ticker).toBeTruthy()
    for (const cle of ['activite', 'fondamentaux', 'source']) expect(fiche.blocs[cle]).toBeTruthy()
  })

  it('shows the free accounts before the paid reading, for a guest', async () => {
    await renderFiche(slug, { entitlement: 'guest' })

    const comptes = screen.getByText('Les comptes en détail')
    const retiens = screen.getByRole('heading', { name: 'Ce que j’en retiens' })
    expect(precede(comptes, retiens)).toBe(true)
    // What the company does still opens the page, before the accounts.
    expect(precede(screen.getByRole('heading', { name: 'Ce que fait l’entreprise' }), comptes)).toBe(true)
  })

  it('keeps the paid teaser exactly as RecitInvestir renders it (moved, not changed)', async () => {
    const { container } = await renderFiche(slug, { entitlement: 'guest' })

    const text = container.textContent ?? ''
    expect(text).toMatch(/Ce que les membres lisent en plus/)
    expect(text).toMatch(/Voir l.abonnement/)
    expect(text).toMatch(/J.ai déjà un compte/)
    // And nothing paid is in the served HTML.
    expect(text).not.toMatch(/Ce qui peut mal tourner/)
  })

  it('puts the price widget last, after the source, before the identity block', async () => {
    await renderFiche(slug, { entitlement: 'guest' })

    const cours = screen.getByRole('heading', { name: 'Le cours du titre' })
    const source = screen.getByText('Refais-le toi-même')
    const retiens = screen.getByRole('heading', { name: 'Ce que j’en retiens' })
    const identite = screen.getByRole('heading', { name: /Qui écrit ceci/ })

    expect(precede(retiens, cours)).toBe(true)
    expect(precede(source, cours)).toBe(true)
    expect(precede(cours, identite)).toBe(true)
    // No other section heading follows the widget.
    const h2 = screen.getAllByRole('heading', { level: 2 })
    expect(h2.filter(h => precede(cours, h)).map(h => h.textContent)).toEqual([
      'Qui écrit ceci, et dans quel cadre',
    ])
  })

  it('dates the computation with the medium date', async () => {
    await renderFiche(slug, { entitlement: 'guest' })

    expect(screen.getByText(/Calcul du 7 sept\. 2026\./)).toBeTruthy()
  })
})
