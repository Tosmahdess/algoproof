import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import MiRegimeBadge from '@/components/MiRegimeBadge'

vi.mock('@/lib/queries', () => ({
  getLatestMiSnapshot: vi.fn(),
}))

import { getLatestMiSnapshot } from '@/lib/queries'

const mockSnap = {
  id: '1',
  snapshot_at: new Date().toISOString(),
  composite_score: 12.5,
  regime: 'GREEN' as const,
  sentiment_regime: 'NEUTRAL' as const,
  is_safe: true,
  is_macro_safe: true,
  sentiment_score: 20,
  derivatives_score: 15,
  news_score: -5,
  macro_score: 10,
  institutional_score: 30,
  market_bias: 'BOTH' as const,
  trend_regime: 'TRANSITION' as const,
  tactical_regime: 'NEUTRAL' as const,
  allow_long: true,
  allow_short: true,
  btc_vs_ema200_pct: -1.5,
  created_at: new Date().toISOString(),
}

describe('MiRegimeBadge', () => {
  it('shows Current Regime label initially', () => {
    vi.mocked(getLatestMiSnapshot).mockResolvedValue(mockSnap)
    render(<MiRegimeBadge />)
    expect(screen.getByText('Régime actuel')).toBeDefined()
  })

  it('shows regime name after data loads', async () => {
    vi.mocked(getLatestMiSnapshot).mockResolvedValue(mockSnap)
    render(<MiRegimeBadge />)
    await waitFor(() => expect(screen.getByText('GREEN')).toBeDefined())
  })

  it('shows score after data loads', async () => {
    vi.mocked(getLatestMiSnapshot).mockResolvedValue(mockSnap)
    render(<MiRegimeBadge />)
    await waitFor(() => expect(screen.getByText(/12\.5/)).toBeDefined())
  })

  it('shows trading enabled when is_safe is true', async () => {
    vi.mocked(getLatestMiSnapshot).mockResolvedValue(mockSnap)
    render(<MiRegimeBadge />)
    await waitFor(() => expect(screen.getByText(/Trading autorisé/)).toBeDefined())
  })

  it('shows no data message when snapshot is null', async () => {
    vi.mocked(getLatestMiSnapshot).mockResolvedValue(null)
    render(<MiRegimeBadge />)
    await waitFor(() => expect(screen.getByText(/Pas encore de données/)).toBeDefined())
  })
})
