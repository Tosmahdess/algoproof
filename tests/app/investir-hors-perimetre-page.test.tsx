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
  permanentRedirect: (to: string) => { throw new Error(`REDIRECT:${to}`) },
}))
vi.mock('@/components/CoursTradingView', () => ({ CoursTradingView: () => null }))

import FicheInvestir, { generateMetadata, generateStaticParams } from '@/app/investir/[slug]/page'
import { HORS_PERIMETRE_RETIREES, listeHorsPerimetre, tousLesSlugs } from '@/lib/investir'

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

  // The request FAILS here, it does not answer « guest »: that is the branch
  // RecitInvestir's own `.catch` takes, which sets `{ entitlement: 'guest' }`
  // itself. Serving that payload tested the route's answer, not the catch.
  it('shows no offer either when the request fails', async () => {
    const fetchMock = vi.fn(async () => { throw new Error('network') })
    vi.stubGlobal('fetch', fetchMock)
    const { container } = render(await FicheInvestir({ params: Promise.resolve({ slug }) }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    await act(async () => {})
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

// Audit 2026-10, n° 14: the panel said « Elle ne dépose pas de rapport annuel
// auprès du régulateur américain » on every fiche, false for the ones that file
// a 10-K or a 20-F. The sentence is now computed from the fiche's cause.
describe('/investir/[slug], out-of-scope company: why I do not read it', () => {
  const panneau = async (slug: string) => {
    const { getByTestId } = await renderFiche(slug, { horsPerimetre: true, blocs: {} })
    return (getByTestId('constats').textContent ?? '').replace(/\s+/g, ' ')
  }

  it('a company with no 10-K and no 20-F is told so', async () => {
    const t = await panneau('lvmh')
    expect(t).toMatch(/ne dépose auprès du régulateur américain ni 10-K ni 20-F/)
  })

  it('a company that files is never told it does not file, and the page links its filings', async () => {
    const t = await panneau('visa')
    expect(t).toMatch(/Elle dépose un rapport annuel auprès du régulateur américain/)
    expect(t).not.toMatch(/ne dépose (pas|ni)/)
    const lien = screen.getByRole('link', { name: /Ses dépôts sur sec\.gov/ })
    expect(lien.getAttribute('href')).toBe('https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1403161')
  })

  it('a company that ended its registration gives both dates', async () => {
    const t = await panneau('electronic-arts')
    expect(t).toMatch(/11 mai 2026/)
    expect(t).toMatch(/14 août 2026/)
    expect(t).not.toMatch(/ne dépose (pas|ni)/)
  })

  it('the page description says the same thing as the panel', async () => {
    const visa = await generateMetadata({ params: Promise.resolve({ slug: 'visa' }) })
    expect(String(visa.description)).not.toMatch(/ne dépose (pas|ni)/)
    const lvmh = await generateMetadata({ params: Promise.resolve({ slug: 'lvmh' }) })
    expect(String(lvmh.description)).toMatch(/ni 10-K ni 20-F/)
  })
})

// Block and Philips are read under another slug; Solana is not a company. Their
// old URLs land on the fiche that reads them, or on the list.
describe('/investir/[slug], retired out-of-scope slugs', () => {
  it('redirects each one, permanently, to its target', async () => {
    for (const [slug, cible] of Object.entries(HORS_PERIMETRE_RETIREES)) {
      await expect(FicheInvestir({ params: Promise.resolve({ slug }) })).rejects.toThrow(`REDIRECT:${cible}`)
    }
  })

  it('is not prerendered as a page, and has no metadata of its own', async () => {
    const slugs = generateStaticParams().map(p => p.slug)
    for (const slug of Object.keys(HORS_PERIMETRE_RETIREES)) {
      expect(slugs).not.toContain(slug)
      expect(await generateMetadata({ params: Promise.resolve({ slug }) })).toEqual({})
    }
  })
})
