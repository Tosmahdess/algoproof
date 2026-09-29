import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SampleNote from '@/components/SampleNote'

describe('SampleNote', () => {
  it('says a zero-trade bot is waiting, not broken', () => {
    render(<SampleNote totalTrades={0} />)
    const text = screen.getByTestId('sample-note').textContent ?? ''
    expect(text).toMatch(/attend/i)
    expect(text).not.toMatch(/erreur|panne|bug/i)
  })

  it('says nothing about a small sample: the figures just below already warn (user, 2026-09-29)', () => {
    // MetricsRow prints « Échantillon faible (7 trades, moins de 20) » under the tiles; the
    // « 7 trades seulement » line above them said it twice.
    const { container } = render(<SampleNote totalTrades={7} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing once the sample is large enough', () => {
    const { container } = render(<SampleNote totalTrades={60} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows the custom dormancy note when one is supplied', () => {
    render(<SampleNote totalTrades={0} dormancyNote="Pas de tendance depuis avril." />)
    expect(screen.getByText(/Pas de tendance depuis avril/)).toBeTruthy()
  })
})
