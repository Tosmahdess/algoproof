import { describe, it, expect } from 'vitest'
import { selectFreeTickers } from '@/lib/free-tier'

const F = (ticker: string, verdict: string) => ({ ticker, verdict })
const M = (ticker: string, signal_level: string | null, drawdown_pct: number | null) =>
  ({ ticker, signal_level, drawdown_pct })

describe('selectFreeTickers', () => {
  it('keeps only renforcer with an active signal', () => {
    const out = selectFreeTickers({
      fiches: [F('AAA', 'renforcer'), F('BBB', 'maintenir'), F('CCC', 'passer')],
      universe: [M('AAA', 'major', -20), M('BBB', 'crash', -50), M('CCC', 'crash', -60)],
    })
    expect(out).toEqual(['AAA'])
  })

  it('ranks by signal strength first, then by the deepest drawdown', () => {
    const out = selectFreeTickers({
      fiches: [F('AAA', 'renforcer'), F('BBB', 'renforcer'), F('CCC', 'renforcer')],
      universe: [M('AAA', 'minor', -60), M('BBB', 'crash', -10), M('CCC', 'crash', -40)],
    })
    expect(out).toEqual(['CCC', 'BBB', 'AAA'])
  })

  it('returns at most the limit', () => {
    const fiches = ['A', 'B', 'C', 'D', 'E', 'F'].map((t) => F(t, 'renforcer'))
    const universe = ['A', 'B', 'C', 'D', 'E', 'F'].map((t, i) => M(t, 'crash', -i))
    expect(selectFreeTickers({ fiches, universe })).toHaveLength(5)
  })

  it('falls back to renforcer without a signal when the market is high', () => {
    const out = selectFreeTickers({
      fiches: [F('AAA', 'renforcer'), F('BBB', 'renforcer')],
      universe: [M('AAA', null, -5), M('BBB', null, -30)],
    })
    expect(out).toEqual(['BBB', 'AAA'])
  })

  it('never puts a signalled name after a fallback name', () => {
    const out = selectFreeTickers({
      fiches: [F('AAA', 'renforcer'), F('BBB', 'renforcer')],
      universe: [M('AAA', null, -90), M('BBB', 'minor', -1)],
    })
    expect(out).toEqual(['BBB', 'AAA'])
  })

  it('ignores a fiche with no row in the universe', () => {
    const out = selectFreeTickers({
      fiches: [F('AAA', 'renforcer'), F('ZZZ', 'renforcer')],
      universe: [M('AAA', 'crash', -30)],
    })
    expect(out).toEqual(['AAA'])
  })

  it('is empty when nothing qualifies', () => {
    expect(selectFreeTickers({ fiches: [], universe: [] })).toEqual([])
  })
})
