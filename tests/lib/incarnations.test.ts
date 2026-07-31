import { describe, it, expect } from 'vitest'
import { incarnationsOf, conceptSlugForStrategy } from '@/lib/incarnations'
import { getStrategyFiche, STRATEGY_FICHES } from '@/lib/strategy-library'
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

// FIX (final whole-branch review, I8): the inverse join, used by the register's
// group header and the bot fiche's breadcrumb.
describe('conceptSlugForStrategy', () => {
  it('resolves an aliased operator string to its fiche', () => {
    expect(conceptSlugForStrategy('EMA Cross H4')).toBe('ema-cross')
    expect(conceptSlugForStrategy('ORB')).toBe('orb')
  })

  it('matches regardless of case and surrounding whitespace, like incarnationsOf', () => {
    expect(conceptSlugForStrategy('  orb ')).toBe('orb')
  })

  it('returns null for a strategy no fiche claims, rather than guessing', () => {
    expect(conceptSlugForStrategy('Wavelet Cross')).toBeNull()
    expect(conceptSlugForStrategy('ORB Reversal')).toBeNull()
    expect(conceptSlugForStrategy('')).toBeNull()
  })

  // The property that matters: a header linking to a concept page must lead to
  // a page that lists the bot it was clicked from. Two independent copies of
  // the matching rule would eventually disagree and produce exactly that lie.
  it('is the exact inverse of incarnationsOf for every fiche', () => {
    for (const fiche of STRATEGY_FICHES) {
      const bot = mkBot({ strategy: fiche.title })
      const slug = conceptSlugForStrategy(bot.strategy)
      if (slug === null) {
        expect(incarnationsOf(fiche, [bot])).toEqual([])
      } else {
        expect(incarnationsOf(getStrategyFiche(slug)!, [bot])).toHaveLength(1)
      }
    }
  })
})
