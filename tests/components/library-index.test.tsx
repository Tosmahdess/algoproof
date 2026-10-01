import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LibraryIndex, { type IdeaCardData } from '@/components/library/LibraryIndex'

// The library index (lot 2, D079): one card per idea, 20 at a time, filters as
// lists, and no performance figure on a card (a "representative" PF would be a
// pick among variants, made after the fact).

function idea(i: number, over: Partial<IdeaCardData> = {}): IdeaCardData {
  return {
    idea_key: `Base${i}|${i % 2 ? 'H4' : 'D1'}`, base: `Base${i}`, tf: i % 2 ? 'H4' : 'D1',
    family: i % 3 ? 'breakout' : 'trend', slug: `base${i}-${i % 2 ? 'h4' : 'd1'}`,
    label: `Idée ${i}`, familyLabel: i % 3 ? 'Cassure' : 'Suivi de tendance',
    n_variants: 10 + i, n_backtest: 8, n_awaiting: 6, n_trailing: 2, n_not_surviving: 0,
    n_running: i % 4 === 0 ? 2 : 0, n_stopped: 0, n_sim_up: 0, n_sim_down: 0,
    n_sim_young: i % 4 === 0 ? 2 : 0, pf_q1: 1.1, pf_median: 1.234, pf_q3: 1.4, n_pf: 8,
    last_found_at: `2026-09-${String(10 + (i % 18)).padStart(2, '0')}T00:00:00Z`, ...over,
  }
}

const IDEAS = Array.from({ length: 30 }, (_, i) => idea(i + 1))

describe('LibraryIndex', () => {
  it('shows 20 cards, then 10 more on demand', () => {
    render(<LibraryIndex ideas={IDEAS} />)
    expect(screen.getAllByRole('link', { name: /Idée \d+/ })).toHaveLength(20)
    fireEvent.click(screen.getByRole('button', { name: /Afficher 10 de plus/ }))
    expect(screen.getAllByRole('link', { name: /Idée \d+/ })).toHaveLength(30)
  })

  it('filters by timeframe', () => {
    render(<LibraryIndex ideas={IDEAS} />)
    fireEvent.change(screen.getByLabelText('Unité de temps'), { target: { value: 'D1' } })
    expect(screen.getAllByRole('link', { name: /Idée \d+/ })).toHaveLength(15)
  })

  it('links each card to its idea page', () => {
    render(<LibraryIndex ideas={[idea(4)]} />)
    expect(screen.getByRole('link', { name: /Idée 4/ }).getAttribute('href')).toBe('/bibliotheque/base4-d1')
  })

  it('prints no PF on a card', () => {
    const { container } = render(<LibraryIndex ideas={IDEAS} />)
    expect(container.textContent).not.toMatch(/PF|1,23|1\.23/)
  })

  it('never calls a backtest-only survivor a paper bot', () => {
    const { container } = render(<LibraryIndex ideas={[idea(1, { n_running: 0 })]} />)
    expect(container.textContent).toMatch(/backtest seul/)
    expect(container.textContent).not.toMatch(/paper/i)
  })
})
