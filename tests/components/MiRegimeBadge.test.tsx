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
  is_safe: true,
  is_macro_safe: true,
  sentiment_score: 20,
  derivatives_score: 15,
  news_score: -5,
  macro_score: 10,
  created_at: new Date().toISOString(),
}

describe('MiRegimeBadge', () => {
  it('shows Current Regime label initially', () => {
    vi.mocked(getLatestMiSnapshot).mockResolvedValue(mockSnap)
    render(<MiRegimeBadge />)
    expect(screen.getByText('Current Regime')).toBeDefined()
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
    await waitFor(() => expect(screen.getByText(/Trading ENABLED/)).toBeDefined())
  })

  it('shows no data message when snapshot is null', async () => {
    vi.mocked(getLatestMiSnapshot).mockResolvedValue(null)
    render(<MiRegimeBadge />)
    await waitFor(() => expect(screen.getByText(/No data/)).toBeDefined())
  })
})
