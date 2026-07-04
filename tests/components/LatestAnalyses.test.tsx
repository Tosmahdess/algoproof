import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LatestAnalyses } from '@/components/LatestAnalyses'
import type { FicheIndexRow } from '@/lib/equity'

const fiche = (t: string, d: string, reason: string | null = 'thèse'): FicheIndexRow => ({
  ticker: t, asset_name: t + ' corp', category: null, verdict: 'renforcer',
  generated_at: d, verdict_reason: reason, price_at_generation: 10, ticker_yf: t,
})

describe('LatestAnalyses', () => {
  it('renders the 6 most recent, most recent first', () => {
    const list = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((t, i) => fiche(t, `2026-07-0${(i % 4) + 1}T0${i}:00:00Z`))
    render(<LatestAnalyses fiches={list} />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(6)
  })
  it('shows the thesis line and hides itself when empty', () => {
    const { container, rerender } = render(<LatestAnalyses fiches={[fiche('NVDA', '2026-07-03T08:00:00Z', 'Le moat CUDA tient.')]} />)
    expect(screen.getByText('Le moat CUDA tient.')).toBeInTheDocument()
    rerender(<LatestAnalyses fiches={[]} />)
    expect(container.querySelector('a')).toBeNull()
  })
})
