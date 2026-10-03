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

const text = () => document.body.textContent?.replace(/\s+/g, ' ') ?? ''

describe('MiRegimeBadge', () => {
  // Spec §3.4: no « Chargement… » sentence in a first screen, a skeleton of the
  // final height instead.
  it('shows a skeleton, not a loading sentence, before the data arrives', () => {
    vi.mocked(getLatestMiSnapshot).mockResolvedValue(mockSnap)
    render(<MiRegimeBadge />)
    expect(screen.getByTestId('mi-regime-skeleton')).toBeDefined()
    expect(text()).not.toMatch(/Chargement/)
  })

  // One state, one word (spec §4): the word of the lexicon, capitalised, as the
  // first thing read. Not the sentiment enum beside it.
  it('writes the regime with the lexicon word, capitalised', async () => {
    vi.mocked(getLatestMiSnapshot).mockResolvedValue(mockSnap)
    render(<MiRegimeBadge />)
    await waitFor(() => expect(screen.getByText('Calme')).toBeDefined())
    expect(text()).not.toMatch(/NEUTRAL|neutre/)
  })

  // Refonte page Météo (2026-10-03; audit 2026-10, n° 46): « score 14,5 » had no scale.
  // The score carries its sign and its scale. The four pillar scores left the panel for
  // the pillars register under the chart, so the panel no longer prints them.
  it('writes the global score with its sign and its scale, in French figures', async () => {
    vi.mocked(getLatestMiSnapshot).mockResolvedValue(mockSnap)
    render(<MiRegimeBadge />)
    await waitFor(() => expect(screen.getByText(/\+12,5/)).toBeDefined())
    expect(text()).toContain('sur une échelle de −100 à +100')
    expect(text()).not.toMatch(/\d\.\d/)
    expect(text()).not.toMatch(/score MI|MI/)
  })

  // The state of the day in one panel, like the verdict of a bot: the regime as its
  // heading, what it allows, and the date of the reading.
  it('is one framed panel titled by the regime, dated', async () => {
    vi.mocked(getLatestMiSnapshot).mockResolvedValue(mockSnap)
    render(<MiRegimeBadge />)
    const title = await screen.findByRole('heading', { level: 2, name: 'Calme' })
    const panel = screen.getByTestId('meteo-panel')
    expect(panel.contains(title)).toBe(true)
    expect(panel.getAttribute('aria-labelledby')).toBe(title.id)
    expect(text()).toMatch(/Relevé le \d/)
  })

  // « Longs Shorts » had no label (n° 46).
  it('names the sides the bots may take, in words', async () => {
    vi.mocked(getLatestMiSnapshot).mockResolvedValue({ ...mockSnap, allow_short: false })
    render(<MiRegimeBadge />)
    await waitFor(() => expect(screen.getByText('Calme')).toBeDefined())
    expect(text()).toContain('Sens permis : à la hausse seulement')
    expect(text()).not.toMatch(/Longs|Shorts/)
  })

  // A calm market is not a gain: the title stays in ink. Stress takes the loss
  // contour and ink, with its word, the way a crossed rule does on a bot.
  it('writes calm in ink and stress in the loss ink with a full loss contour', async () => {
    vi.mocked(getLatestMiSnapshot).mockResolvedValue(mockSnap)
    const { unmount } = render(<MiRegimeBadge />)
    const calm = await screen.findByRole('heading', { level: 2, name: 'Calme' })
    expect(calm.className).toMatch(/text-foreground/)
    expect(screen.getByTestId('meteo-panel').className).not.toMatch(/border-negative/)
    unmount()
    vi.mocked(getLatestMiSnapshot).mockResolvedValue({ ...mockSnap, regime: 'RED' as const, is_safe: false })
    render(<MiRegimeBadge />)
    const stress = await screen.findByRole('heading', { level: 2, name: 'Stress' })
    expect(stress.className).toMatch(/text-negative/)
    expect(screen.getByTestId('meteo-panel').className).toMatch(/border-negative/)
  })

  it('says what the state changes for the bots today, when entries are open', async () => {
    vi.mocked(getLatestMiSnapshot).mockResolvedValue(mockSnap)
    render(<MiRegimeBadge />)
    await waitFor(() =>
      expect(screen.getByText(/^Les bots entrent normalement\.$/)).toBeDefined(),
    )
    expect(text()).toContain('Ce que ça autorise pour mes bots')
    expect(text()).not.toMatch(/Trading autorisé/)
  })

  it('says the entries are blocked when is_safe is false', async () => {
    vi.mocked(getLatestMiSnapshot).mockResolvedValue({ ...mockSnap, is_safe: false, regime: 'RED' as const })
    render(<MiRegimeBadge />)
    await waitFor(() => expect(screen.getByText('Stress')).toBeDefined())
    expect(text()).toMatch(/Les bots n’entrent pas/)
    expect(text()).not.toMatch(/Trading bloqué/)
  })

  it('shows no data message when snapshot is null', async () => {
    vi.mocked(getLatestMiSnapshot).mockResolvedValue(null)
    render(<MiRegimeBadge />)
    await waitFor(() => expect(screen.getByText(/Pas encore de données/)).toBeDefined())
  })

  it('does not render the retired institutional pillar', async () => {
    // institutional_score scoring was retired server-side on 2026-06-26 and is always
    // null in prod since — the dead "INSTITUTIONNEL —" 5th pillar must not display,
    // even though the snapshot type/mock still carries the (unused) field.
    vi.mocked(getLatestMiSnapshot).mockResolvedValue(mockSnap)
    render(<MiRegimeBadge />)
    await waitFor(() => expect(screen.getByText('Calme')).toBeDefined())
    expect(screen.queryByText('Institutionnel')).toBeNull()
  })
})
