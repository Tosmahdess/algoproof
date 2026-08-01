import { describe, it, expect } from 'vitest'
import { incarnationsOf } from '@/lib/incarnations'
import { getStrategyFiche, STRATEGY_FICHES } from '@/lib/strategy-library'
import { ficheSlugForBot } from '@/lib/strategy-keys'
import { EMA_CROSS_SLUGS, prodBot, mkBot } from '../fixtures/bots'

const emaCross = getStrategyFiche('ema-cross')!
const maCross = getStrategyFiche('ma-cross')!
const orb = getStrategyFiche('orb')!

describe('incarnationsOf', () => {
  // The case the old string join got wrong, silently: eight deployed bots, eight
  // distinct `strategy` sentences, one strategy. The page said « aucun bot ne
  // fait tourner cette stratégie » and no test disagreed.
  it('finds all eight EMA Cross incarnations, not one and not none', () => {
    const fleet = EMA_CROSS_SLUGS.map(slug => prodBot(slug))
    expect(incarnationsOf(emaCross, fleet).map(b => b.slug)).toEqual([...EMA_CROSS_SLUGS])
  })

  it('finds the two MA-cross incarnations', () => {
    const fleet = [
      prodBot('hmacross-bf22'),
      prodBot('temacross-bf10'),
      prodBot('v1-spot'),
      prodBot('grid-btc-spot'),
    ]
    expect(incarnationsOf(maCross, fleet).map(b => b.slug))
      .toEqual(['hmacross-bf22', 'temacross-bf10'])
  })

  it('does not lend a bot to a neighbouring fiche', () => {
    const fleet = EMA_CROSS_SLUGS.map(slug => prodBot(slug))
    expect(incarnationsOf(maCross, fleet)).toEqual([])
    expect(incarnationsOf(orb, fleet)).toEqual([])
  })

  it('returns an empty array for a fiche nothing runs, without throwing', () => {
    const stoch = getStrategyFiche('stochastic')!
    expect(incarnationsOf(stoch, [prodBot('orb-bf25')])).toEqual([])
  })

  it('lists an engine-born bot on the fiche its engine base names', () => {
    const engineBot = mkBot({
      slug: 'emacross-m30-k3',
      engine_unit_key: 'EMAcross|M30|data_20260701|3',
    })
    expect(incarnationsOf(emaCross, [engineBot]).map(b => b.slug)).toEqual(['emacross-m30-k3'])
  })

  it('claims no bot for a fiche when the bot runs something with no fiche', () => {
    for (const fiche of STRATEGY_FICHES) {
      expect(incarnationsOf(fiche, [prodBot('grid-btc-spot')])).toEqual([])
    }
  })

  // The property that matters across surfaces: the register's group header links
  // to a concept page, and that page must list the bot the visitor clicked from.
  // Both sides now call ficheSlugForBot, so this cannot drift.
  it('is the exact inverse of ficheSlugForBot for every fiche', () => {
    const fleet = [
      ...EMA_CROSS_SLUGS.map(slug => prodBot(slug)),
      prodBot('hmacross-bf22'), prodBot('temacross-bf10'), prodBot('orb-bf25'),
      prodBot('grid-btc-spot'), prodBot('tsi-bf8'), prodBot('ttmsqueeze-bf7'),
    ]
    for (const bot of fleet) {
      const slug = ficheSlugForBot(bot)
      if (slug === null) {
        for (const fiche of STRATEGY_FICHES) {
          expect(incarnationsOf(fiche, [bot])).toEqual([])
        }
      } else {
        expect(incarnationsOf(getStrategyFiche(slug)!, [bot])).toHaveLength(1)
      }
    }
  })
})
