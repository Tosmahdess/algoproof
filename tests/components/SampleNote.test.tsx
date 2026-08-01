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

  it('warns that a small sample cannot be concluded from', () => {
    render(<SampleNote totalTrades={7} />)
    expect(screen.getByTestId('sample-note').textContent).toMatch(/trop tôt/i)
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
