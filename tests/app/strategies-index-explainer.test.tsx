// tests/app/strategies-index-explainer.test.tsx
//
// The gauntlet explainer used to render on all 22 concept pages. It describes
// the ENGINE, not the strategy, so reading it 22 times punished exactly the
// visitor who browses several fiches. It now lives ONCE, at the top of the
// /strategies index, and each concept page carries a one-line pointer instead.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('unexpected notFound') },
  permanentRedirect: (to: string) => { throw new Error(`unexpected redirect to ${to}`) },
}))

const bots = vi.hoisted(() => ({ current: [] as unknown[] }))
vi.mock('@/lib/funnel', () => ({ getFunnelCounts: async () => null }))
vi.mock('@/lib/queries', () => ({
  getAllBotsWithStats: async () => bots.current,
  getBotSlugs: async () => [],
}))

import ConceptPage from '@/app/strategies/[concept]/page'
import StrategiesIndexPage from '@/app/strategies/page'
import { GAUNTLET_EXPLAINER_TITLE } from '@/lib/gauntlet-explainer'

describe('/strategies — the gauntlet explainer lives on the index', () => {
  it('renders the explainer once, before the strategy groups', async () => {
    bots.current = []
    const { container } = render(await StrategiesIndexPage())
    const explainer = screen.getByTestId('index-gauntlet')
    expect(explainer.textContent).toContain(GAUNTLET_EXPLAINER_TITLE)
    // "en premier" : the explainer block precedes the register of fiches.
    const register = container.querySelector('[data-testid="strategies-register"]')!
    expect(register).toBeTruthy()
    expect(
      explainer.compareDocumentPosition(register) & Node.DOCUMENT_POSITION_FOLLOWING,
      'explainer must come before the fiche register',
    ).toBeTruthy()
  })

  it('the explainer carries the membership link on its access sentence', async () => {
    bots.current = []
    render(await StrategiesIndexPage())
    const link = screen
      .getAllByRole('link')
      .find(a => a.getAttribute('href') === 'https://lab.algoproof.fr/membre')
    expect(link, 'no link to the membership page').toBeTruthy()
  })
})

// 2026-09-19 (D055): on a 390 px phone the search came at 2 083 px, after ~700
// words of method. The explainer now folds on a phone (Repli), stays open on a
// computer, and the 22 concept pages still land on it opened through the anchor.
describe('/strategies — the explainer folds on a phone, never on a computer', () => {
  it('turns the explainer title into a closed disclosure button on a phone', async () => {
    bots.current = []
    render(await StrategiesIndexPage())
    const bouton = screen.getByRole('button', { name: new RegExp(GAUNTLET_EXPLAINER_TITLE) })
    expect(bouton.getAttribute('aria-expanded')).toBe('false')
    expect(bouton.className).toContain('sm:hidden')
    // The folded card still says what the method admits it cannot prove.
    expect(bouton.textContent).toContain('la limite que j’écris noir sur blanc')
  })

  it('keeps the anchor the concept pages aim at, on the heading the fold reads', async () => {
    bots.current = []
    render(await StrategiesIndexPage())
    const titre = document.getElementById('comment-je-decide')!
    expect(titre.tagName).toBe('H2')
    expect(screen.getByTestId('index-gauntlet').contains(titre)).toBe(true)
  })

  it('offers a jump to the search on a computer only', async () => {
    bots.current = []
    render(await StrategiesIndexPage())
    const lien = screen.getByRole('link', { name: /Aller aux stratégies/ })
    expect(lien.getAttribute('href')).toBe('#registre')
    expect(lien.className).toContain('max-sm:hidden')
    // Sits right under the intro on a computer: the intro keeps its phone
    // margin only below sm, the link carries the gap to the card.
    expect(screen.getByText(/Comment marche chaque stratégie/).className).toContain('sm:mb-3')
    const registre = document.getElementById('registre')!
    expect(registre.getAttribute('data-testid')).toBe('strategies-register')
    expect(registre.querySelector('input[type="search"], input')).toBeTruthy()
  })

  it('sets the honesty paragraphs at body size, and the method at a reading measure (max-w-2xl: max-w-prose cost 307 px on a computer)', async () => {
    bots.current = []
    render(await StrategiesIndexPage())
    const honnete = screen.getByText(/^Reste une limite que je préfère écrire/)
    expect(honnete.className).toContain('text-sm')
    expect(honnete.className).not.toContain('text-xs')
    expect(honnete.closest('[id="comment-je-decide-corps"]')!.className).toContain('max-w-2xl')
  })
})

describe('/strategies/[concept] — pointer instead of the full explainer', () => {
  it('no longer renders the full gauntlet block', async () => {
    bots.current = []
    render(await ConceptPage({ params: Promise.resolve({ concept: 'ema-cross' }) }))
    expect(screen.queryByTestId('concept-gauntlet')).toBeNull()
  })

  it('links to the explainer on the index instead', async () => {
    bots.current = []
    render(await ConceptPage({ params: Promise.resolve({ concept: 'ema-cross' }) }))
    const pointer = screen
      .getAllByRole('link')
      .find(a => a.getAttribute('href') === '/strategies#comment-je-decide')
    expect(pointer, 'concept page must point at the shared explainer').toBeTruthy()
  })
})
