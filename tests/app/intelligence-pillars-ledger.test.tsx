import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import PillarsLedger from '@/app/intelligence/PillarsLedger'
import type { MiSnapshot } from '@/lib/types'

// Audit 2026-10, n° 9 (P1): the pillars took the gain and loss tokens the wrong way round,
// Sentiment +48 in red and Actualités −6,1 in green. In the register a pillar's score is
// ink, its sign written; a missing score is « — », never coloured.
const SNAP = {
  snapshot_at: '2026-10-03T12:00:00Z',
  composite_score: 14.5,
  sentiment_score: 48,
  derivatives_score: -9.4,
  news_score: -6.1,
  macro_score: 17.8,
} as unknown as MiSnapshot

const colourClass = /\btext-(negative|positive|warning|severe|brand|accent)\b/

describe('PillarsLedger', () => {
  it('lists the four pillars in order, with their weight and what they follow', () => {
    render(<PillarsLedger snapshot={SNAP} />)
    const rows = screen.getAllByTestId('pillar-row')
    expect(rows.map(r => within(r).getByTestId('pillar-name').textContent)).toEqual(['Sentiment', 'Dérivés', 'Actualités', 'Macro'])
    expect(rows[0].textContent).toMatch(/poids 30\s%/)
    expect(rows[2].textContent).toMatch(/poids 5\s%/)
  })

  it('writes every score with its sign, in ink, never in a gain or loss colour', () => {
    render(<PillarsLedger snapshot={SNAP} />)
    const scores = screen.getAllByTestId('pillar-score')
    expect(scores.map(s => s.textContent)).toEqual(['+48,0', '−9,4', '−6,1', '+17,8'])
    for (const s of scores) {
      expect(s.className).not.toMatch(colourClass)
      expect(s.getAttribute('style')).toBeNull()
    }
  })

  it('writes the scale and the date of the reading', () => {
    const { container } = render(<PillarsLedger snapshot={SNAP} />)
    expect(container.textContent).toContain('sur une échelle de −100 à +100')
    expect(container.textContent).toMatch(/Relevé le 3 octobre 2026/)
  })

  it('writes « — » without colour for a missing score, and for no reading at all', () => {
    const { unmount } = render(<PillarsLedger snapshot={{ ...SNAP, news_score: null }} />)
    const news = screen.getAllByTestId('pillar-score')[2]
    expect(news.textContent).toBe('—')
    expect(news.className).not.toMatch(colourClass)
    unmount()
    const { container } = render(<PillarsLedger snapshot={null} />)
    expect(screen.getAllByTestId('pillar-score').map(s => s.textContent)).toEqual(['—', '—', '—', '—'])
    expect(container.textContent).not.toMatch(/Relevé le/)
  })
})
