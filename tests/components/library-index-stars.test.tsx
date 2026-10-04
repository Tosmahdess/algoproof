import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// Idea star on the library register (chantier bibliotheque, lot 2): one provider for the
// whole table (one request), a star per row BESIDE the idea's link, never inside it (a
// button inside a link is two targets in one), and words that say « idée », not « bot ».
vi.mock('next/navigation', () => ({ usePathname: () => '/bibliotheque' }))
vi.mock('@/lib/favorites-client', async (orig) => ({
  ...(await orig<typeof import('@/lib/favorites-client')>()),
  accessToken: async () => null,             // a visitor who is not signed in
}))

import LibraryIndex, { type IdeaRowData } from '@/components/library/LibraryIndex'

const idea: IdeaRowData = {
  idea_key: 'HMAcross|H4', base: 'HMAcross', tf: 'H4', family: 'trend', slug: 'hmacross-h4',
  label: 'Croisement HMA', familyLabel: 'Suivi de tendance', n_variants: 6, n_backtest: 0, n_awaiting: 0,
  n_trailing: 0, n_not_surviving: 0, n_running: 6, n_live: 0, n_paper: 6, n_stopped: 0, n_sim_up: 0,
  n_sim_down: 0, n_sim_young: 6, pf_q1: null, pf_median: null, pf_q3: null, n_pf: 0, last_found_at: null,
}

describe('LibraryIndex, idea stars', () => {
  it('puts a star beside each idea link, sending a guest to sign in', async () => {
    window.history.replaceState(null, '', '/bibliotheque')
    render(<LibraryIndex ideas={[idea]} stars />)
    const star = await waitFor(() => screen.getByRole('link', { name: 'Garder Croisement HMA H4 en favori' }))
    const name = screen.getByRole('link', { name: 'Croisement HMA H4' })
    expect(name.contains(star)).toBe(false)
    expect(star.contains(name)).toBe(false)
    expect(star.getAttribute('href')).toMatch(/bibliotheque/)
    expect(star.getAttribute('title')).toMatch(/cette idée/)
  })
})

describe('LibraryIndex, idea stars not live yet', () => {
  it('shows no star and no « Les plus gardées » option until the lab accepts ideas', async () => {
    render(<LibraryIndex ideas={[idea]} />)
    await new Promise(r => setTimeout(r, 0))
    expect(screen.queryByRole('link', { name: /en favori/ })).toBeNull()
    expect(screen.queryByRole('option', { name: 'Les plus gardées' })).toBeNull()
  })
})
