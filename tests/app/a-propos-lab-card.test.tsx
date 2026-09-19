import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import AProposPage from '@/app/a-propos/page'

// D053: a link that names the TOOL opens the tool (/lab), not the landing at
// the lab root. The « Le labo » card describes the backtester, so it enters
// the app; the sentence further down (« le labo s'ouvre sans compte ») stays
// a description of the site and keeps the root.
describe('À propos — the « Le labo » card', () => {
  it('opens the backtester in the app', () => {
    render(<AProposPage />)
    const card = screen.getByText("L'outil pour tester tes propres stratégies : backtest, walk-forward, comparaisons.").closest('a')!
    expect(card.getAttribute('href')).toBe('https://lab.algoproof.fr/lab')
  })
})
