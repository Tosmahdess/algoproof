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
