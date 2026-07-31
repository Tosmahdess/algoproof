import { describe, it, expect } from 'vitest'
import {
  EMPTY_FILTERS,
  parseFleetFilters,
  serializeFleetFilters,
  applyFleetFilters,
  optionCounts,
  activeFilterCount,
  isDirectionNarrowed,
  describeEmptyResult,
} from '@/lib/bot-filters'
import { FIXTURE_FLEET, mkBot } from '../fixtures/bots'

describe('parse and serialize', () => {
  it('round-trips a populated state', () => {
    const state = {
      ...EMPTY_FILTERS,
      family: ['trend', 'breakout'] as const,
      venue: ['kraken'] as const,
      asset: ['BTC'],
      direction: 'long' as const,
      sort: 'trades' as const,
      dir: 'asc' as const,
    }
    const round = parseFleetFilters(serializeFleetFilters(state as never))
    expect(round).toEqual(state)
  })

  it('emits parameters in a constant order regardless of insertion order', () => {
    const a = serializeFleetFilters({ ...EMPTY_FILTERS, venue: ['kraken'], family: ['trend'] } as never)
    const b = serializeFleetFilters({ ...EMPTY_FILTERS, family: ['trend'], venue: ['kraken'] } as never)
    expect(a.toString()).toBe(b.toString())
  })

  it('omits defaults so a pristine view has a clean URL', () => {
    expect(serializeFleetFilters(EMPTY_FILTERS).toString()).toBe('')
  })

  it('ignores unknown parameters instead of throwing', () => {
    const s = parseFleetFilters(new URLSearchParams('family=trend&bogus=42&sort=nonsense'))
    expect(s.family).toEqual(['trend'])
    expect(s.sort).toBe('proven')
  })

  it('drops values outside the taxonomy rather than trusting the URL', () => {
    const s = parseFleetFilters(new URLSearchParams('family=trend,notafamily&venue=mtgox'))
    expect(s.family).toEqual(['trend'])
    expect(s.venue).toEqual([])
  })
})

describe('applyFleetFilters', () => {
  it('returns every publicly visible bot when nothing is selected', () => {
    // Not FIXTURE_FLEET.length: the fleet also contains a `backtest` candidate
    // that must never be publicly listed (see the dedicated test below).
    const publiclyVisible = FIXTURE_FLEET.filter(b => b.status !== 'backtest')
    expect(applyFleetFilters(FIXTURE_FLEET, EMPTY_FILTERS)).toHaveLength(publiclyVisible.length)
  })

  it('excludes a backtest candidate under every filter state, including the pristine one', () => {
    // status='backtest' means an engine candidate that has never been
    // deployed: no paper run, no live run. It must never reach the public
    // fleet, regardless of which facets are selected — this is a visibility
    // rule, not something a `status` filter choice can opt back into.
    const candidate = FIXTURE_FLEET.find(b => b.status === 'backtest')
    expect(candidate).toBeDefined()

    expect(applyFleetFilters(FIXTURE_FLEET, EMPTY_FILTERS).map(b => b.slug))
      .not.toContain(candidate!.slug)
    expect(applyFleetFilters(FIXTURE_FLEET, { ...EMPTY_FILTERS, status: ['paper'] }).map(b => b.slug))
      .not.toContain(candidate!.slug)
    expect(applyFleetFilters(FIXTURE_FLEET, { ...EMPTY_FILTERS, family: [candidate!.family] }).map(b => b.slug))
      .not.toContain(candidate!.slug)
  })

  it('ORs within a facet and ANDs across facets', () => {
    const both = applyFleetFilters(FIXTURE_FLEET, { ...EMPTY_FILTERS, family: ['trend', 'breakout'] })
    expect(both.length).toBeGreaterThan(
      applyFleetFilters(FIXTURE_FLEET, { ...EMPTY_FILTERS, family: ['trend'] }).length,
    )
    const narrowed = applyFleetFilters(FIXTURE_FLEET, {
      ...EMPTY_FILTERS, family: ['trend'], venue: ['kraken'],
    })
    expect(narrowed.map(b => b.slug)).toEqual(['v1-spot'])
  })

  it('keeps a dormant bot: zero trades is not a reason to hide a deployed bot', () => {
    const kept = applyFleetFilters(FIXTURE_FLEET, { ...EMPTY_FILTERS, family: ['trend'] })
    expect(kept.map(b => b.slug)).toContain('ichimoku-dormant')
  })

  it('a bot with an unmapped venue survives every filter except a venue filter', () => {
    const all = applyFleetFilters(FIXTURE_FLEET, EMPTY_FILTERS)
    expect(all.map(b => b.slug)).toContain('new-venue-bot')
    const byVenue = applyFleetFilters(FIXTURE_FLEET, { ...EMPTY_FILTERS, venue: ['hyperliquid'] })
    expect(byVenue.map(b => b.slug)).not.toContain('new-venue-bot')
  })

  it('matches the base asset exactly, so BTC does not swallow WBTC', () => {
    const got = applyFleetFilters(FIXTURE_FLEET, { ...EMPTY_FILTERS, asset: ['btc'] })
    expect(got.length).toBeGreaterThan(0)
    const wrapped = [mkBot({ slug: 'wbtc-bot', assets: ['WBTC'] })]
    expect(applyFleetFilters(wrapped, { ...EMPTY_FILTERS, asset: ['BTC'] })).toEqual([])
  })

  it('direction never changes WHICH bots are listed', () => {
    // `direction` is a stats-recomputation switch, not a facet: a bot is not
    // long or short, its trades are. It stays in the URL because it changes what
    // the numbers mean, but it must never silently drop a bot from the register.
    const all = applyFleetFilters(FIXTURE_FLEET, EMPTY_FILTERS).map(b => b.slug)
    for (const direction of ['long', 'short'] as const) {
      expect(applyFleetFilters(FIXTURE_FLEET, { ...EMPTY_FILTERS, direction }).map(b => b.slug))
        .toEqual(all)
    }
  })
})

describe('optionCounts', () => {
  it('counts every family option so a zero option can be shown as zero', () => {
    const counts = optionCounts(FIXTURE_FLEET, EMPTY_FILTERS)
    expect(counts.family.trend).toBeGreaterThan(0)
    expect(counts.family['price-action']).toBe(1)
  })

  it('counts a facet against the OTHER facets, not against itself', () => {
    // Selecting one family must not drive the other family counts to zero —
    // that is what makes multi-select usable at all.
    const counts = optionCounts(FIXTURE_FLEET, { ...EMPTY_FILTERS, family: ['trend'] })
    expect(counts.family.breakout).toBeGreaterThan(0)
  })

  it('does not count a backtest candidate anywhere', () => {
    const candidate = FIXTURE_FLEET.find(b => b.status === 'backtest')!
    const counts = optionCounts(FIXTURE_FLEET, EMPTY_FILTERS)
    const familyOnlyFromCandidate = FIXTURE_FLEET.filter(
      b => b.status !== 'backtest' && b.family === candidate.family,
    ).length
    expect(counts.family[candidate.family]).toBe(familyOnlyFromCandidate)
  })
})

describe('activeFilterCount', () => {
  it('is zero for a pristine state and counts selected values otherwise', () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0)
    expect(activeFilterCount({ ...EMPTY_FILTERS, family: ['trend', 'carry'], venue: ['kraken'] })).toBe(3)
  })

  it('does not count sort as a filter', () => {
    expect(activeFilterCount({ ...EMPTY_FILTERS, sort: 'pnl', dir: 'asc' })).toBe(0)
  })

  it('does not count direction: it recomputes stats, it does not narrow the list', () => {
    expect(activeFilterCount({ ...EMPTY_FILTERS, direction: 'long' })).toBe(0)
    expect(activeFilterCount({ ...EMPTY_FILTERS, direction: 'short' })).toBe(0)
  })
})

describe('isDirectionNarrowed', () => {
  it('is false at the default and true otherwise, independently of activeFilterCount', () => {
    expect(isDirectionNarrowed(EMPTY_FILTERS)).toBe(false)
    expect(isDirectionNarrowed({ ...EMPTY_FILTERS, direction: 'long' })).toBe(true)
    expect(isDirectionNarrowed({ ...EMPTY_FILTERS, direction: 'short' })).toBe(true)
  })
})

describe('describeEmptyResult', () => {
  it('is null while results remain', () => {
    expect(describeEmptyResult(FIXTURE_FLEET, EMPTY_FILTERS)).toBeNull()
  })

  it('names the single facet that emptied the list', () => {
    const state = { ...EMPTY_FILTERS, family: ['carry'] as never, venue: ['kraken'] as never }
    const msg = describeEmptyResult(FIXTURE_FLEET, state)
    expect(msg).not.toBeNull()
    expect(msg).toContain('Kraken')
  })

  it('falls back to a generic message when no single facet is responsible', () => {
    const lonely = [mkBot({ family: 'trend', venue: 'kraken', timeframe: 'H4' })]
    const state = { ...EMPTY_FILTERS, family: ['carry'] as never, venue: ['okx'] as never }
    expect(describeEmptyResult(lonely, state)).toBeTruthy()
  })
})
