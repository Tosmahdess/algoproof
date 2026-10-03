import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MiHistoryChart, { dayTicks, yDomain } from '@/components/MiHistoryChart'
import type { MiSnapshot } from '@/lib/types'

// Audit 2026-10 (page Météo): the legend was clickable but out of reach of the keyboard
// (n° 45), its names mixed « News » and « Global » with the French of the page (n° 46),
// the pillars were drawn with the gain and loss tokens (n° 9), and the dates of the X
// axis overlapped on a phone (n° 44).

const HOUR = 3_600_000
const start = Date.parse('2026-09-26T12:00:00Z')
const rows: MiSnapshot[] = Array.from({ length: 7 * 48 }, (_, i) => ({
  snapshot_at: new Date(start + i * HOUR / 2).toISOString(),
  composite_score: 10,
  sentiment_score: 48,
  derivatives_score: -9,
  news_score: -6.1,
  macro_score: 17,
} as unknown as MiSnapshot))

describe('MiHistoryChart controls', () => {
  it('offers each pillar as a real button with aria-pressed, in the French of the page', () => {
    render(<MiHistoryChart data={rows} />)
    const group = screen.getByRole('group', { name: /pilier/i })
    const buttons = Array.from(group.querySelectorAll('button'))
    expect(buttons.map(b => b.textContent)).toEqual(['Sentiment', 'Dérivés', 'Actualités', 'Macro'])
    for (const b of buttons) {
      expect(b.getAttribute('type')).toBe('button')
      expect(b.getAttribute('aria-pressed')).toBe('false')
    }
    expect(document.body.textContent).not.toMatch(/\bNews\b|\bGlobal\b/)
  })

  it('shows one pillar at a time beside the global score, and hides it on a second press', () => {
    render(<MiHistoryChart data={rows} />)
    const sentiment = screen.getByRole('button', { name: 'Sentiment' })
    const macro = screen.getByRole('button', { name: 'Macro' })
    fireEvent.click(sentiment)
    expect(sentiment.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(macro)
    expect(macro.getAttribute('aria-pressed')).toBe('true')
    expect(sentiment.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(macro)
    expect(macro.getAttribute('aria-pressed')).toBe('false')
  })

  it('names the drawn lines in its legend, the pillar only when it is shown', () => {
    render(<MiHistoryChart data={rows} />)
    const legend = screen.getByTestId('meteo-legend')
    expect(legend.textContent).toContain('Score global')
    expect(legend.textContent).not.toContain('Sentiment')
    fireEvent.click(screen.getByRole('button', { name: 'Sentiment' }))
    expect(screen.getByTestId('meteo-legend').textContent).toContain('Sentiment')
  })

  it('says so, without colour, when there is no history', () => {
    render(<MiHistoryChart data={[]} />)
    expect(screen.getByText('Pas encore de données historiques.')).toBeDefined()
    expect(screen.queryByRole('group')).toBeNull()
  })
})

describe('dayTicks', () => {
  // One date per day, at the first reading of each Paris day, the partial first day
  // skipped: no two dates a few hours apart (n° 44).
  it('puts one tick per full day, at the first reading of that day', () => {
    const ticks = dayTicks(rows.map(r => Date.parse(r.snapshot_at)))
    expect(ticks.length).toBe(7)
    for (let i = 1; i < ticks.length; i++) expect(ticks[i] - ticks[i - 1]).toBeGreaterThanOrEqual(23 * HOUR)
    expect(ticks[0]).toBeGreaterThan(start)
  })

  it('returns nothing for no data', () => {
    expect(dayTicks([])).toEqual([])
  })
})

describe('yDomain', () => {
  it('keeps the ±50 frame when the values fit, and widens symmetrically when they do not', () => {
    expect(yDomain([10, -20, 48])).toBe(50)
    expect(yDomain([10, -71])).toBe(80)
    expect(yDomain([null, 120])).toBe(100)
    // A line at +50 would run along the frame's edge.
    expect(yDomain([50])).toBe(60)
  })
})
