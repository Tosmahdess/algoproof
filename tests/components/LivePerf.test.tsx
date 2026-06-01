import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { LivePerf } from '@/components/LivePerf'

afterEach(() => vi.restoreAllMocks())

it('shows live price and positive % vs price_at_generation', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ price: 220, currency: 'USD', asOf: 'x' }) })) as unknown as typeof fetch)
  render(<LivePerf tickerYf="NVDA" priceAtGeneration={200} fallbackPrice={null} />)
  await waitFor(() => expect(screen.getByText(/\+10/)).toBeInTheDocument())
})

it('falls back to fallbackPrice with "différé" when quote fails', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch)
  render(<LivePerf tickerYf="NVDA" priceAtGeneration={200} fallbackPrice={210} />)
  await waitFor(() => expect(screen.getByText(/différé/i)).toBeInTheDocument())
})
