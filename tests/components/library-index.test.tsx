import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import LibraryIndex, { type IdeaRowData } from '@/components/library/LibraryIndex'
import { EMPTY_LIBRARY_FILTERS, LIBRARY_PAGE } from '@/lib/library-filters'

vi.mock('next/navigation', () => ({ usePathname: () => '/bibliotheque' }))

// The library index (lot 2, D079), a register since the refonte « registre »
// (2026-10-03, audit n° 41): one row per idea, LIBRARY_PAGE rows at a time, filters
// as lists, the state in the URL, and no performance figure on a row (a
// "representative" PF would be a pick among variants, made after the fact).
// Updated from the card grid in the same commit: the cards, their sketch and the
// 20-card page are gone on purpose; the rules they carried are kept below.

function idea(i: number, over: Partial<IdeaRowData> = {}): IdeaRowData {
  return {
    idea_key: `Base${i}|${i % 2 ? 'H4' : 'D1'}`, base: `Base${i}`, tf: i % 2 ? 'H4' : 'D1',
    family: i % 3 ? 'breakout' : 'trend', slug: `base${i}-${i % 2 ? 'h4' : 'd1'}`,
    label: `Idée ${i}`, familyLabel: i % 3 ? 'Cassure' : 'Suivi de tendance',
    n_variants: 10 + i, n_backtest: 8, n_awaiting: 6, n_trailing: 2, n_not_surviving: 0,
    n_running: i % 4 === 0 ? 2 : 0, n_live: 0, n_paper: i % 4 === 0 ? 2 : 0, n_stopped: 0, n_sim_up: 0, n_sim_down: 0,
    n_sim_young: i % 4 === 0 ? 2 : 0, pf_q1: 1.1, pf_median: 1.234, pf_q3: 1.4, n_pf: 8,
    last_found_at: `2026-09-${String(10 + (i % 18)).padStart(2, '0')}T00:00:00Z`, ...over,
  }
}

const IDEAS = Array.from({ length: LIBRARY_PAGE + 15 }, (_, i) => idea(i + 1))
const rowLinks = () => screen.getAllByRole('link', { name: /Idée \d+/ })

beforeEach(() => { window.history.replaceState(null, '', '/bibliotheque') })

describe('LibraryIndex', () => {
  it('shows one page of rows, then the rest on demand', () => {
    render(<LibraryIndex ideas={IDEAS} />)
    expect(rowLinks()).toHaveLength(LIBRARY_PAGE)
    fireEvent.click(screen.getByRole('button', { name: /Voir les 15 suivantes/ }))
    expect(rowLinks()).toHaveLength(LIBRARY_PAGE + 15)
    expect(window.location.search).toBe(`?n=${LIBRARY_PAGE * 2}`)
  })

  it('filters by horizon, and writes it in the URL', () => {
    render(<LibraryIndex ideas={IDEAS} />)
    fireEvent.change(screen.getByLabelText('Horizon'), { target: { value: 'D1' } })
    expect(rowLinks()).toHaveLength(22)
    expect(window.location.search).toBe('?tf=D1')
  })

  it('opens on the state a shared URL carries', () => {
    render(<LibraryIndex ideas={IDEAS} initialState={{ ...EMPTY_LIBRARY_FILTERS, q: 'base4' }} />)
    expect(rowLinks().map(a => a.textContent)).toEqual(['Idée 45 H4', 'Idée 44 D1', 'Idée 43 H4', 'Idée 42 D1', 'Idée 41 H4', 'Idée 40 D1', 'Idée 4 D1'])
  })

  it('links each row to its idea page', () => {
    render(<LibraryIndex ideas={[idea(4)]} />)
    expect(screen.getByRole('link', { name: /Idée 4/ }).getAttribute('href')).toBe('/bibliotheque/base4-d1')
  })

  it('prints no PF on a row', () => {
    const { container } = render(<LibraryIndex ideas={IDEAS} />)
    expect(container.textContent).not.toMatch(/PF|1,23|1\.23/)
  })

  it('never calls a backtest-only survivor a paper bot', () => {
    const { container } = render(<LibraryIndex ideas={[idea(1, { n_running: 0, n_paper: 0 })]} />)
    expect(container.textContent).toMatch(/Backtest seul/)
    expect(container.textContent).not.toMatch(/paper/i)
  })

  it('has no heading of its own: the page holds the h1 and the h2 (audit n° 76, h1 then h3)', () => {
    const { container } = render(<LibraryIndex ideas={IDEAS} />)
    expect(container.querySelector('h1, h2, h3, h4')).toBeNull()
  })

  it('agrees its counts with their nouns, zero and one included (audit n° 76)', () => {
    render(<LibraryIndex ideas={[idea(1, { n_variants: 1 })]} />)
    expect(screen.getByTestId('library-count').textContent).toMatch(/^1 idée, 1 variante,/)
  })
})

describe('LibraryIndex, the empty state (audit n° 40)', () => {
  it('offers its own reset at every width, and the bar drops its own', () => {
    render(<LibraryIndex ideas={IDEAS} initialState={{ ...EMPTY_LIBRARY_FILTERS, q: 'zzz', tf: 'D1' }} />)
    const empty = screen.getByTestId('library-empty')
    expect(empty.textContent).toMatch(/Aucune idée ne correspond/)
    expect(screen.getByTestId('library-count').textContent).toMatch(/^0 idée sur 45, 0 variante\./)
    const button = within(empty).getByRole('button', { name: 'Effacer la recherche et les filtres' })
    expect(button.className).not.toMatch(/hidden/)
    expect(screen.queryByRole('button', { name: 'Tout effacer' })).toBeNull()
    fireEvent.click(button)
    expect(rowLinks()).toHaveLength(LIBRARY_PAGE)
    expect(window.location.search).toBe('')
  })

  it('disables an option that could only empty the list', () => {
    render(<LibraryIndex ideas={IDEAS} />)
    const backtestOnly = screen.getByRole('option', { name: /Aucune lancée \(\d+\)/ }) as HTMLOptionElement
    const running = screen.getByRole('option', { name: /Au moins une lancée \(\d+\)/ }) as HTMLOptionElement
    expect(running.disabled).toBe(false)
    expect(backtestOnly.disabled).toBe(true) // n_backtest 8 < n_variants on every fixture
  })
})

describe('LibraryIndex, real money first (R1)', () => {
  it('gives real money its own column, before the simulation', () => {
    const { container } = render(<LibraryIndex ideas={[idea(4, { n_live: 1, n_paper: 2, n_running: 3 })]} />)
    const heads = [...container.querySelectorAll('th')].map(th => th.textContent)
    expect(heads.indexOf('Argent réel')).toBeGreaterThan(-1)
    expect(heads.indexOf('Argent réel')).toBeLessThan(heads.indexOf('En simulation'))
  })
  it('calls a flat result zero or below, never a gain', () => {
    const { container } = render(<LibraryIndex ideas={[idea(4, { n_sim_down: 1, n_sim_young: 1 })]} />)
    expect(container.textContent).toMatch(/à zéro ou en dessous/)
  })
})

describe('LibraryIndex, default order', () => {
  it('opens on the ideas with the most variants (user, 2026-10-01; D085)', () => {
    render(<LibraryIndex ideas={IDEAS} />)
    // n_variants = 10 + i: the last idea has the most.
    expect(rowLinks()[0].getAttribute('href')).toBe('/bibliotheque/base45-h4')
    expect(screen.getByTestId('library-count').textContent).toMatch(/classées par nombre de variantes/)
  })
})
