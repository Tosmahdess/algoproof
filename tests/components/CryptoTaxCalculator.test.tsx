import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CryptoTaxCalculator from '@/components/CryptoTaxCalculator'
import { EXEMPTION_CESSION_EUR, fmtRate, PFU_FLAT_RATE, SOCIAL_RATE } from '@/lib/crypto-tax'

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

  // Audit 2026-10, n° 1: « 10 000 » then « 15 000 » showed a 5 € gain and 0 € of tax.
  it('reads amounts typed with French thousands separators', () => {
    render(<CryptoTaxCalculator />)
    fill('10 000', '15 000')
    fireEvent.change(screen.getByLabelText(/tranche/i), { target: { value: '0.3' } })
    expect(screen.getByTestId('gain').textContent).toMatch(/5[\s  ]?000,00/)
    expect(screen.getByTestId('tax-due').textContent).toMatch(/1[\s  ]?570,00/)
    expect(screen.queryByText(/exonér/i)).toBeNull()
  })

  it('accepts a decimal comma', () => {
    render(<CryptoTaxCalculator />)
    fill('1 000,50', '1 500,50')
    expect(screen.getByTestId('gain').textContent).toMatch(/500,00/)
  })

  // Audit 2026-10, n° 18: « abc » read 0 in silence, « -500 » was accepted.
  it('refuses a non-numeric entry, says why next to the field, and shows no result', () => {
    render(<CryptoTaxCalculator />)
    fill('abc', '1500')
    const input = screen.getByLabelText(/total investi/i)
    expect(input.getAttribute('aria-invalid')).toBe('true')
    const describedBy = input.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    const message = document.getElementById(describedBy!)
    expect(message?.textContent).toMatch(/montant/i)
    expect(screen.queryByTestId('tax-due')).toBeNull()
    expect(screen.queryByTestId('gain')).toBeNull()
    expect(screen.queryByText(/moins-value/i)).toBeNull()
  })

  it('refuses a negative amount on the sale field too', () => {
    render(<CryptoTaxCalculator />)
    fill('1000', '-500')
    const input = screen.getByLabelText(/valeur de revente/i)
    expect(input.getAttribute('aria-invalid')).toBe('true')
    const message = document.getElementById(input.getAttribute('aria-describedby')!)
    expect(message?.textContent).toMatch(/positif|négatif/i)
    expect(screen.queryByTestId('tax-due')).toBeNull()
    expect(screen.queryByText(/moins-value/i)).toBeNull()
  })

  it('clears the message once the entry is fixed', () => {
    render(<CryptoTaxCalculator />)
    fill('abc', '1500')
    fill('1000', '1500')
    const input = screen.getByLabelText(/total investi/i)
    expect(input.getAttribute('aria-invalid')).not.toBe('true')
    expect(input.getAttribute('aria-describedby')).toBeNull()
    expect(screen.getByTestId('tax-due')).toBeTruthy()
  })

  it('announces the result in a status region', () => {
    render(<CryptoTaxCalculator />)
    const status = screen.getByRole('status')
    fill('1000', '1500')
    expect(status.contains(screen.getByTestId('tax-due'))).toBe(true)
  })

  // Brief « aucun chiffre tapé à la main »: the rates and the threshold come from
  // src/lib/crypto-tax.ts, so the labels cannot drift from the computation.
  it('writes its rates and threshold from the constants it computes with', () => {
    render(<CryptoTaxCalculator />)
    fill('100', '300')
    const text = document.body.textContent!.replace(/\s+/g, ' ')
    expect(text).toContain(`Flat tax (${fmtRate(PFU_FLAT_RATE)})`.replace(/\s+/g, ' '))
    expect(text).toContain(`+ ${fmtRate(SOCIAL_RATE)}`.replace(/\s+/g, ' '))
    expect(text).toContain(`${EXEMPTION_CESSION_EUR}`)
    // drawn icons only: no arrow glyph standing for « donc »
    expect(text).not.toMatch(/[→↗]/)
  })
})
