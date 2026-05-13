import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ExchangeAlert from '@/components/ExchangeAlert'

describe('ExchangeAlert', () => {
  it('renders banner for Binance Futures exchange', () => {
    render(<ExchangeAlert exchange="Binance Futures" />)
    expect(screen.getByText(/France/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Bybit/i })).toBeInTheDocument()
  })

  it('renders banner for exchange string containing Binance Futures', () => {
    render(<ExchangeAlert exchange="28 actifs Binance Futures" />)
    expect(screen.getByText(/France/i)).toBeInTheDocument()
  })

  it('returns null for Binance Spot', () => {
    const { container } = render(<ExchangeAlert exchange="Binance Spot" />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null for Hyperliquid', () => {
    const { container } = render(<ExchangeAlert exchange="Hyperliquid" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders Hyperliquid link', () => {
    render(<ExchangeAlert exchange="Binance Futures" />)
    expect(screen.getByRole('link', { name: /Hyperliquid/i })).toBeInTheDocument()
  })

  it('renders link to /start guide', () => {
    render(<ExchangeAlert exchange="Binance Futures" />)
    expect(screen.getByRole('link', { name: /Guide complet/i })).toBeInTheDocument()
  })
})
