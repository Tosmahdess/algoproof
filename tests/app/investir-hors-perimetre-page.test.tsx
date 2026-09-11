// tests/app/investir-hors-perimetre-page.test.tsx
//
// 2026-09-11 review (P5): an out-of-scope fiche mounted RecitInvestir without
// telling it, so it sold « deux paragraphes » to a guest on a company that has
// at most one. The page now says so, and the component shows what the route
// served, or nothing: no offer, no « Chargement » left on screen.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('unexpected notFound') },
}))
vi.mock('@/components/CoursTradingView', () => ({ CoursTradingView: () => null }))

import FicheInvestir from '@/app/investir/[slug]/page'
import { listeHorsPerimetre, tousLesSlugs } from '@/lib/investir'

const TEASER = [/Ce que les membres lisent en plus/, /Voir l.abonnement/, /J.ai déjà un compte/]

function serve(payload: unknown) {
  const fetchMock = vi.fn(async () => ({ ok: true, json: async () => payload }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function renderFiche(slug: string, payload: unknown) {
  const fetchMock = serve(payload)
  const view = render(await FicheInvestir({ params: Promise.resolve({ slug }) }))
  await waitFor(() => expect(fetchMock).toHaveBeenCalled())
  await act(async () => {})
  return view
}

afterEach(() => vi.unstubAllGlobals())

describe('/investir/[slug], out-of-scope company', () => {
  const slug = listeHorsPerimetre()[0].slug

  it('shows no offer to a guest, and no loading line, when the table has nothing', async () => {
    const { container } = await renderFiche(slug, { horsPerimetre: true, blocs: {} })
    const text = container.textContent ?? ''
    for (const t of TEASER) expect(text).not.toMatch(t)
    expect(text).not.toMatch(/Chargement/)
  })

  it('shows no offer either when the request fails', async () => {
    const { container } = await renderFiche(slug, { entitlement: 'guest' })
    const text = container.textContent ?? ''
    for (const t of TEASER) expect(text).not.toMatch(t)
    expect(text).not.toMatch(/Chargement/)
  })

  it('shows the paragraph the table has, to anyone', async () => {
    await renderFiche(slug, { horsPerimetre: true, blocs: { lecture: null, risques: 'Un risque propre.' } })
    expect(await screen.findByText('Un risque propre.')).toBeTruthy()
    expect(screen.getByText('Ce qui peut mal tourner')).toBeTruthy()
  })

  it('never points at « Les chiffres ci-dessus » when the analysis is unavailable', async () => {
    const { container } = await renderFiche(slug, { horsPerimetre: true, indisponible: true })
    expect(container.textContent).toMatch(/momentanément indisponible/)
    expect(container.textContent).not.toMatch(/chiffres ci-dessus/)
  })

  it('its disclosure claims neither figures from an annual report nor a verdict', async () => {
    const { container } = await renderFiche(slug, { horsPerimetre: true, blocs: {} })
    const text = (container.textContent ?? '').replace(/\s+/g, ' ')
    expect(text).toContain('Le texte de cette fiche est mon interprétation, pas un fait.')
    expect(text).not.toMatch(/Les chiffres viennent du rapport annuel/)
    expect(text).not.toMatch(/Le verdict et le texte/)
  })
})

describe('/investir/[slug], graded company (unchanged)', () => {
  it('still shows the offer to a guest, so the checks above are not vacuous', async () => {
    const { container } = await renderFiche(tousLesSlugs()[0], { entitlement: 'guest' })
    for (const t of TEASER) expect(container.textContent ?? '').toMatch(t)
  })

  it('its disclosure names the annual report, so the out-of-scope check is not vacuous', async () => {
    const { container } = await renderFiche(tousLesSlugs()[0], { entitlement: 'guest' })
    expect((container.textContent ?? '').replace(/\s+/g, ' ')).toContain(
      'Les chiffres viennent du rapport annuel de la société, dont la fiche donne la date de dépôt et le numéro.',
    )
  })
})
