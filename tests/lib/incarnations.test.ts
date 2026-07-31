import { describe, it, expect } from 'vitest'
import { incarnationsOf } from '@/lib/incarnations'
import { getStrategyFiche } from '@/lib/strategy-library'
import { mkBot } from '../fixtures/bots'

const orb = getStrategyFiche('orb')!

describe('incarnationsOf', () => {
  it('finds every bot running the strategy, not just one', () => {
    const bots = [
      mkBot({ slug: 'orb-bf25', strategy: 'ORB' }),
      mkBot({ slug: 'orb-hl-2', strategy: 'ORB' }),
      mkBot({ slug: 'other', strategy: 'EMA Cross' }),
    ]
    expect(incarnationsOf(orb, bots).map(b => b.slug)).toEqual(['orb-bf25', 'orb-hl-2'])
  })

  it('matches regardless of case and surrounding whitespace', () => {
    const bots = [mkBot({ slug: 'a', strategy: '  orb ' })]
    expect(incarnationsOf(orb, bots)).toHaveLength(1)
  })

  it('returns an empty array for a fiche nothing runs, without throwing', () => {
    const stoch = getStrategyFiche('stochastic')!
    expect(incarnationsOf(stoch, [mkBot({ strategy: 'ORB' })])).toEqual([])
  })

  it('does not match a different strategy whose name merely contains this one', () => {
    const bots = [mkBot({ slug: 'x', strategy: 'ORB Reversal' })]
    expect(incarnationsOf(orb, bots)).toEqual([])
  })
})
