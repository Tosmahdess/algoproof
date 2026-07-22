import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ScreeningGrid from '@/components/ScreeningGrid'

const campaigns = [
  { base: 'EMAcross', tf: 'D1', state: 'judged' as const, judged_on: '2026-07-21',
    data_dir: 'data_20260710', n_behaviors: 374, n_rejected: 374, n_marginal: 0,
    n_candidates: 0, n_assets: 30, null_bar: 95 },
  { base: 'EMAcross', tf: 'H4', state: 'judged' as const, judged_on: '2026-07-22',
    data_dir: 'data_20260710', n_behaviors: 73770, n_rejected: 73744, n_marginal: 20,
    n_candidates: 2, n_assets: 30, null_bar: 95 },
  { base: 'EMAcross', tf: 'M15', state: 'judged' as const, judged_on: '2026-07-20',
    data_dir: 'data_20260710', n_behaviors: 500, n_rejected: 490, n_marginal: 10,
    n_candidates: null, n_assets: 30, null_bar: 95 },
]

describe('ScreeningGrid', () => {
  it('shows every timeframe, including the untested ones', () => {
    render(<ScreeningGrid campaigns={campaigns} />)
    for (const tf of ['D1', 'H4', 'H1', 'M30', 'M15', 'M5']) {
      expect(screen.getAllByText(tf).length).toBeGreaterThan(0)
    }
    expect(screen.getAllByText('jamais testé').length).toBe(3)
  })

  it('renders the zero and the two with the same emphasis', () => {
    render(<ScreeningGrid campaigns={campaigns} />)
    const zero = screen.getByTestId('cell-EMAcross-D1-count')
    const two = screen.getByTestId('cell-EMAcross-H4-count')
    expect(zero.className).toBe(two.className)
    expect(zero.textContent).toBe('0')
    expect(two.textContent).toBe('2')
  })

  it('formats large counts with a non-breaking thousands separator', () => {
    render(<ScreeningGrid campaigns={campaigns} />)
    // U+202F narrow no-break space — the French thousands separator convention.
    expect(screen.getByTestId('cell-EMAcross-H4-judged').textContent).toBe('73 770')
  })

  it('never colours a cell by performance', () => {
    const { container } = render(<ScreeningGrid campaigns={campaigns} />)
    expect(container.innerHTML).not.toMatch(/text-positive|text-negative|bg-green|bg-red/)
  })

  it('carries the framing line that kills the real-time reading', () => {
    render(<ScreeningGrid campaigns={campaigns} />)
    expect(screen.getByText(/ce qui bouge, c'est la mesure, pas le marché/i)).toBeTruthy()
  })

  it('renders an em-dash, never a false zero, for a judged campaign whose export failed', () => {
    render(<ScreeningGrid campaigns={campaigns} />)
    const cell = screen.getByTestId('cell-EMAcross-M15-count')
    expect(cell.textContent).toBe('—')
    expect(cell.textContent).not.toBe('0')
  })

  it('states a bare "clos" (never "0 / résultat négatif") for a judged campaign with an unknown count', () => {
    render(<ScreeningGrid campaigns={campaigns} />)
    const row = screen.getByTestId('cell-EMAcross-M15-count').closest('tr')
    expect(row?.textContent).toMatch(/clos/i)
    expect(row?.textContent).not.toMatch(/résultat négatif/i)
  })

  it('formats judged_on in French format, not the raw ISO string', () => {
    render(<ScreeningGrid campaigns={campaigns} />)
    expect(screen.getByText(/22\/07\/2026/)).toBeTruthy()
    expect(screen.queryByText(/2026-07-22/)).toBeNull()
  })

  it('renders the three corpus-wide counters above the framing line', () => {
    render(<ScreeningGrid campaigns={campaigns} />)
    // fixture: D1 (374 behaviors, 374 rejected, 0 standing) + H4 (73770, 73744, 2 standing),
    // M15 is judged but n_candidates is null (export failed) -> its 500/490 still count as
    // judged/rejected, its null n_candidates contributes 0 to standing.
    // judged = 374 + 73770 + 500 = 74644 ; rejected = 374 + 73744 + 490 = 74608 ; standing = 0+2+0 = 2
    // U+202F narrow no-break space — same convention as `count()` (see tests/lib/screening.test.ts).
    expect(screen.getByTestId('corpus-judged').textContent).toBe('74 644')
    expect(screen.getByTestId('corpus-rejected').textContent).toBe('74 608')
    expect(screen.getByTestId('corpus-standing').textContent).toBe('2')
    expect(screen.getByTestId('corpus-strategies-label').textContent).toMatch(/1 stratégie\b/)
    expect(screen.getByTestId('corpus-framing').textContent).toMatch(/J'ai jugé 74 644 configurations sur 1 stratégie/)
    expect(screen.getByTestId('corpus-framing').textContent).toMatch(/J'en ai rejeté 74 608/)
    expect(screen.getByTestId('corpus-framing').textContent).toMatch(/Il en reste 2 en observation/)
  })

  it('renders the three counters with identical visual weight (same className)', () => {
    render(<ScreeningGrid campaigns={campaigns} />)
    const judged = screen.getByTestId('corpus-judged')
    const rejected = screen.getByTestId('corpus-rejected')
    const standing = screen.getByTestId('corpus-standing')
    expect(rejected.className).toBe(judged.className)
    expect(standing.className).toBe(judged.className)
  })

  it('renders the corpus counters as all zeros when the grid is empty', () => {
    render(<ScreeningGrid campaigns={[]} />)
    expect(screen.getByTestId('corpus-judged').textContent).toBe('0')
    expect(screen.getByTestId('corpus-rejected').textContent).toBe('0')
    expect(screen.getByTestId('corpus-standing').textContent).toBe('0')
  })

  it('excludes non-judged campaigns from the corpus counters', () => {
    const onlyQueued = [
      { base: 'Donchian', tf: 'H4', state: 'queued' as const, judged_on: null,
        data_dir: null, n_behaviors: null, n_rejected: null, n_marginal: null,
        n_candidates: null, n_assets: null, null_bar: null },
    ]
    render(<ScreeningGrid campaigns={onlyQueued} />)
    expect(screen.getByTestId('corpus-judged').textContent).toBe('0')
    expect(screen.getByTestId('corpus-rejected').textContent).toBe('0')
    expect(screen.getByTestId('corpus-standing').textContent).toBe('0')
  })
})
