import { describe, it, expect } from 'vitest'
import {
  FICHE_BY_LEGACY_BOT_SLUG,
  FICHE_BY_ENGINE_BASE,
  ficheSlugForBot,
} from '@/lib/strategy-keys'
import { STRATEGY_FICHES } from '@/lib/strategy-library'
import { EMA_CROSS_SLUGS, PROD_STRATEGY, prodBot, mkBot } from '../fixtures/bots'

const legacy = (slug: string) => ({ slug, engine_unit_key: null })

describe('the legacy slug map', () => {
  it('carries exactly the 27 hand-deployed bots, and is frozen at that', () => {
    expect(Object.keys(FICHE_BY_LEGACY_BOT_SLUG)).toHaveLength(27)
  })

  it('only names fiches that exist', () => {
    const known = new Set(STRATEGY_FICHES.map(f => f.slug))
    for (const [slug, fiche] of Object.entries(FICHE_BY_LEGACY_BOT_SLUG)) {
      if (fiche !== null) expect(known.has(fiche), `${slug} → ${fiche}`).toBe(true)
    }
  })
})

describe('ficheSlugForBot', () => {
  // The headline case, and the reason the key had to move off `bots.strategy`:
  // these eight bots carry eight DIFFERENT strategy sentences in production
  // ("EMA Cross H4 (21/55/200)", "EMA 9/50 H4 — EUR/USD", …), so no amount of
  // string matching was ever going to collapse them into one concept.
  it('resolves the eight deployed EMA Cross incarnations to one fiche', () => {
    const resolved = EMA_CROSS_SLUGS.filter(s => ficheSlugForBot(legacy(s)) === 'ema-cross')
    expect(resolved).toHaveLength(8)

    const sentences = new Set(EMA_CROSS_SLUGS.map(s => PROD_STRATEGY[s]))
    expect(sentences.size).toBe(8)
  })

  it('maps exactly those eight legacy slugs to ema-cross — no ninth entry points at it', () => {
    expect(Object.values(FICHE_BY_LEGACY_BOT_SLUG).filter(v => v === 'ema-cross')).toHaveLength(8)
  })

  it('resolves the two MA-cross variants to the ma-cross fiche', () => {
    expect(ficheSlugForBot(legacy('hmacross-bf22'))).toBe('ma-cross')
    expect(ficheSlugForBot(legacy('temacross-bf10'))).toBe('ma-cross')
  })

  it('returns null for a deployed bot no fiche describes', () => {
    expect(ficheSlugForBot(legacy('grid-btc-spot'))).toBeNull()
    expect(ficheSlugForBot(legacy('funding-rate-harvest'))).toBeNull()
  })

  it('returns null for a slug it has never heard of, rather than guessing', () => {
    expect(ficheSlugForBot(legacy('some-bot-that-does-not-exist'))).toBeNull()
  })

  // Everything promoted from now on is engine-born: the legacy map is frozen,
  // so an engine bot must resolve without ever appearing in it.
  it('resolves an engine-born bot through engine_unit_key, not the legacy map', () => {
    const bot = { slug: 'emacross-h1-k3', engine_unit_key: 'EMAcross|H1|data_20260701|3' }
    expect(FICHE_BY_LEGACY_BOT_SLUG[bot.slug]).toBeUndefined()
    expect(ficheSlugForBot(bot)).toBe('ema-cross')
  })

  it('reads only the base segment, so tf, dataset version and K do not matter', () => {
    const keys = [
      'EMAcross|H4|data_20260701|3',
      'EMAcross|M30|data_20260801|5',
      'EMAcross|D1|data_20251201|1',
    ]
    expect(keys.map(k => ficheSlugForBot({ slug: 'x', engine_unit_key: k })))
      .toEqual(['ema-cross', 'ema-cross', 'ema-cross'])
  })

  it('falls back to the legacy map when the engine base is not evidenced yet', () => {
    // WilliamsVolBreak is deliberately absent from FICHE_BY_ENGINE_BASE (no
    // fiche exists for it among the 22 — see the 2026-08-19 comment in
    // strategy-keys.ts). ATRChannel used to be the example here, but wave-1
    // (task 9, 2026-08-19) evidenced it, so it now resolves through the
    // engine base instead — see the test.each block below.
    expect(FICHE_BY_ENGINE_BASE['WilliamsVolBreak']).toBeUndefined()
    expect(ficheSlugForBot({ slug: 'wvolbreak-bf28', engine_unit_key: 'WilliamsVolBreak|H4|v1|3' }))
      .toBeNull()
    expect(ficheSlugForBot({ slug: 'wvolbreak-k3', engine_unit_key: 'WilliamsVolBreak|H4|v1|3' }))
      .toBeNull()

    // The WilliamsVolBreak case above is null in BOTH maps, so it cannot by
    // itself prove the fallback branch runs — it would read the same if
    // ficheSlugForBot short-circuited to null the moment the base were
    // missing from Map B, without ever consulting Map A. Pair an unlisted,
    // fictional base with a slug whose Map A entry is a REAL fiche
    // ('hmacross-bf22' → 'ma-cross') to force a non-null result that only
    // the fallback into Map A can produce.
    expect(FICHE_BY_ENGINE_BASE['NovaBase']).toBeUndefined()
    expect(ficheSlugForBot({ slug: 'hmacross-bf22', engine_unit_key: 'NovaBase|H4|data|base|3' }))
      .toBe('ma-cross')
  })

  // Wave-1 (task 9, 2026-08-19): the eight engine bases the spec evidenced,
  // added to FICHE_BY_ENGINE_BASE alongside the pre-existing EMAcross.
  it.each([
    ['HMAcross|H4|data_20260802|base|3', 'ma-cross'],
    ['TEMAcross|H4|data_20260802|base|3', 'ma-cross'],
    ['KAMAcross|H4|data_20260802|base|3', 'kama-cross'],
    ['DonchianBreakout|D1|data_20260802|base|3', 'donchian'],
    ['KeltnerBreak|H1|data_20260802|base|3', 'keltner'],
    ['ATRChannel|H4|data_20260802|base|3', 'atr-channel'],
    ['HeikinAshiTrend|D1|data_20260802|base|3', 'heikin-ashi'],
    ['ORB|H1|data_20260802|base|3', 'orb'],
  ])('%s → %s', (key, fiche) => {
    expect(ficheSlugForBot({ slug: 'x', engine_unit_key: key })).toBe(fiche)
  })

  it('WilliamsVolBreak stays deliberately unmapped — /overview only', () => {
    expect(ficheSlugForBot({ slug: 'x', engine_unit_key: 'WilliamsVolBreak|D1|data_20260802|base|3' }))
      .toBeNull()
  })

  it('survives a malformed or empty engine key instead of throwing', () => {
    for (const key of ['', '|', '|H4|v1|3', 'EMAcross']) {
      expect(() => ficheSlugForBot({ slug: 'v1-spot', engine_unit_key: key })).not.toThrow()
    }
    expect(ficheSlugForBot({ slug: 'v1-spot', engine_unit_key: '' })).toBe('ema-cross')
    expect(ficheSlugForBot({ slug: 'v1-spot', engine_unit_key: 'EMAcross' })).toBe('ema-cross')
  })

  // The engine made the promotion decision under that base; a slug is a name a
  // human picked afterwards. When they disagree, the machine's record wins.
  it('lets the engine key win over a legacy slug that says otherwise', () => {
    expect(ficheSlugForBot({ slug: 'orb-bf25', engine_unit_key: 'EMAcross|H4|v1|3' }))
      .toBe('ema-cross')
  })

  // Both maps are plain object literals, so an unguarded index lookup falls
  // through to Object.prototype for these names and returns a Function
  // instead of undefined. The inputs here come from production data nobody in
  // this codebase controls, so a bot slug or engine base that happens to
  // collide with a prototype member must resolve to null, not a function.
  it('does not resolve a prototype property name as a fiche slug', () => {
    expect(ficheSlugForBot({ slug: 'toString', engine_unit_key: null })).toBeNull()
    expect(ficheSlugForBot({ slug: 'constructor', engine_unit_key: null })).toBeNull()
    expect(ficheSlugForBot({ slug: 'x', engine_unit_key: 'toString|H4|v1|3' })).toBeNull()
    expect(ficheSlugForBot({ slug: 'x', engine_unit_key: 'hasOwnProperty|H4|v1|3' })).toBeNull()
  })
})

describe('coverage of the library by the deployed fleet', () => {
  it('13 of the 22 fiches have at least one deployed incarnation', () => {
    const claimed = new Set(Object.values(FICHE_BY_LEGACY_BOT_SLUG).filter(v => v !== null))
    expect(STRATEGY_FICHES).toHaveLength(22)
    // The exact list, not just its size: a size-only assertion survives a
    // swapped pairing (e.g. donchian-bf17 → keltner) as long as the count of
    // distinct claimed fiches is unchanged.
    expect([...claimed].sort()).toEqual([
      'atr-channel', 'bollinger', 'donchian', 'ema-cross', 'ema-ribbon',
      'heikin-ashi', 'ichimoku', 'keltner', 'ma-cross', 'macd', 'orb',
      'tsi', 'ttm-squeeze',
    ])
  })

  it('five deployed bots run something no fiche describes', () => {
    const orphans = Object.entries(FICHE_BY_LEGACY_BOT_SLUG).filter(([, v]) => v === null)
    expect(orphans.map(([s]) => s)).toEqual([
      'combobbrsi-bf9', 'funding-rate-harvest',
      'grid-btc-spot', 'funding-rev-long', 'wvolbreak-bf28',
    ])
  })
})

// The guard that keeps invented strategy strings out of the suite: a fixture for
// a real bot must come from the real table, or it does not get built at all.
describe('prodBot', () => {
  it('stamps the verbatim production strategy sentence', () => {
    expect(prodBot('tsi-bf8').strategy).toBe('True Strength Index H4 — 8 actifs')
    expect(prodBot('ttmsqueeze-bf7').strategy).toBe('TTM Squeeze H4 — 7 actifs')
  })

  it('refuses a slug it has no production string for', () => {
    expect(() => prodBot('invented-bot')).toThrow(/No production strategy string/)
  })

  it('leaves mkBot available for bots that model no real deployment', () => {
    expect(() => mkBot({ slug: 'whatever' })).not.toThrow()
  })

  it('refuses to override strategy or slug, so a fixture cannot masquerade as a different bot', () => {
    expect(() => prodBot('v1-spot', { strategy: 'INVENTED' })).toThrow(/cannot override slug or strategy/)
    expect(() => prodBot('v1-spot', { slug: 'fake' })).toThrow(/cannot override slug or strategy/)
  })
})
