import { describe, it, expect } from 'vitest'
import { numericTwinPrimary, numericTwinSlugs } from '@/lib/library'

// Lot 2 (fiche d'origine): a variant that differs from another of its idea only by the
// VALUES of its settings is noindex; the oldest stays indexed. The site cannot see the
// values (they are the lab's), so « only by a number » = same idea, same filter names,
// same assets. On 2026-10-04 one group: three ZScore D1 variants (n° 7, 8, 15) found the
// same second, so the number breaks the tie and n° 7 stays.
const v = (slug: string, over: Partial<Parameters<typeof numericTwinPrimary>[0]> = {}) => ({
  slug, name: `Idée D1 n° ${over.idea_rank ?? 1}`, status: 'paper', idea_key: 'Z|D1',
  filter_keys: ['adx_min', 'atr_ratio'], assets: ['BTC/USDT', 'ETH/USDT'],
  found_at: '2026-09-15T14:49:50Z', idea_rank: 1, ...over,
})

describe('numeric twins', () => {
  const group = [v('z15', { idea_rank: 15 }), v('z7', { idea_rank: 7 }), v('z8', { idea_rank: 8, filter_keys: ['atr_ratio', 'adx_min'], assets: ['ETH/USDT', 'BTC/USDT'] })]

  it('keeps the oldest indexed, then the smallest number, and points the others at it', () => {
    expect(numericTwinPrimary(group[1], group)).toBeNull()
    expect(numericTwinPrimary(group[0], group)).toBe('z7')
    expect(numericTwinPrimary(group[2], group)).toBe('z7')     // order of names and assets is not a difference
  })

  it('prefers an older variant over a smaller number', () => {
    const g = [v('old', { idea_rank: 9, found_at: '2026-08-18T00:00:00Z' }), v('new', { idea_rank: 2 })]
    expect(numericTwinPrimary(g[1], g)).toBe('old')
  })

  it('is not a twin with another filter set, other assets or another idea', () => {
    const base = v('a', { idea_rank: 1 })
    for (const other of [v('b', { idea_rank: 2, filter_keys: ['adx_min'] }), v('c', { idea_rank: 2, assets: ['BTC/USDT'] }), v('d', { idea_rank: 2, idea_key: 'Z|H4' })]) {
      expect(numericTwinPrimary(other, [base, other])).toBeNull()
    }
  })

  it('never counts a backtest-only survivor (it has no page) or a bot outside the library', () => {
    const g = [v('bt', { idea_rank: 1, status: 'backtest' }), v('run', { idea_rank: 2 })]
    expect(numericTwinPrimary(g[1], g)).toBeNull()
    expect(numericTwinPrimary(v('x', { idea_key: null }), [v('x', { idea_key: null }), v('y', { idea_key: null })])).toBeNull()
  })

  it('lists every non-primary twin of a set of variants', () => {
    expect([...numericTwinSlugs(group)].sort()).toEqual(['z15', 'z8'])
  })
})
