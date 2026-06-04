import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CryptoTaxCalculator from '@/components/CryptoTaxCalculator'

function fill(invested: string, sold: string) {
  fireEvent.change(screen.getByLabelText(/total investi/i), { target: { value: invested } })
  fireEvent.change(screen.getByLabelText(/valeur de revente/i), { target: { value: sold } })
}

describe('CryptoTaxCalculator', () => {
  it('shows the gain and the cheaper option (flat for TMI 30%)', () => {
    render(<CryptoTaxCalculator />)
    fill('1000', '1500')
    fireEvent.change(screen.getByLabelText(/tranche/i), { target: { value: '0.3' } })
    expect(screen.getByTestId('gain').textContent).toMatch(/500/)
    expect(screen.getByTestId('tax-due').textContent).toMatch(/157/)
    expect(screen.getByTestId('best').textContent).toMatch(/flat tax/i)
  })

  it('flags an exemption when sale <= 305 €', () => {
    render(<CryptoTaxCalculator />)
    fill('100', '300')
    expect(screen.getByTestId('tax-due').textContent).toMatch(/0/)
    expect(screen.getByText(/exonér/i)).toBeTruthy()
  })

  it('flags a moins-value when sold < invested', () => {
    render(<CryptoTaxCalculator />)
    fill('1000', '600')
    expect(screen.getByText(/moins-value/i)).toBeTruthy()
  })
})
