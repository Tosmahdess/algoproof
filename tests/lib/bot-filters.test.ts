import { describe, it, expect } from 'vitest'
import {
  EMPTY_FILTERS,
  parseFleetFilters,
  serializeFleetFilters,
  applyFleetFilters,
  optionCounts,
  activeFilterCount,
  describeEmptyResult,
} from '@/lib/bot-filters'
import { FIXTURE_FLEET, mkBot } from '../fixtures/bots'

// 2026-08-08: the venue facet (« Où ça tourne ») was removed entirely — pills,
// state, URL parameter and predicates. bot-filters.ts's own history says why
// the plumbing could not stay behind without a control: `direction` was
// deleted for exactly that. `venue` in a URL is an unknown parameter now.

describe('parse and serialize', () => {
  it('round-trips a populated state', () => {
    const state = {
      ...EMPTY_FILTERS,
      family: ['trend', 'breakout'] as const,
      asset: ['BTC'],
      timeframe: ['H4'],
      sort: 'trades' as const,
      dir: 'asc' as const,
    }
    const round = parseFleetFilters(serializeFleetFilters(state as never))
    expect(round).toEqual(state)
  })

  it('emits parameters in a constant order regardless of insertion order', () => {
    const a = serializeFleetFilters({ ...EMPTY_FILTERS, asset: ['BTC'], family: ['trend'] } as never)
    const b = serializeFleetFilters({ ...EMPTY_FILTERS, family: ['trend'], asset: ['BTC'] } as never)
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

  // FIX (final review, I5): `dir_trade` used to round-trip through the URL and
  // change nothing on screen — no renderer read it, and its doc comment claimed
  // a recompute-the-stats safety property the code did not have. It is now an
  // unknown parameter like any other, and must be dropped, not carried.
  it('treats dir_trade as an unknown parameter now that nothing renders it', () => {
    const s = parseFleetFilters(new URLSearchParams('family=trend&dir_trade=long'))
    expect(s).toEqual({ ...EMPTY_FILTERS, family: ['trend'] })
    expect(serializeFleetFilters(s).toString()).toBe('family=trend')
  })

  it('treats venue as an unknown parameter now that the facet is gone', () => {
    // Old shared URLs carry ?venue=kraken. They must render the default view,
    // not crash and not resurrect a control-less filter.
    const s = parseFleetFilters(new URLSearchParams('family=trend&venue=kraken'))
    expect(s).toEqual({ ...EMPTY_FILTERS, family: ['trend'] })
    expect(serializeFleetFilters(s).toString()).toBe('family=trend')
  })

  it('drops values outside the taxonomy rather than trusting the URL', () => {
    const s = parseFleetFilters(new URLSearchParams('family=trend,notafamily&status=zombie'))
    expect(s.family).toEqual(['trend'])
    expect(s.status).toEqual([])
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
    // momentum ∩ H1 = the MACD bot alone (the H1 momentum backtest candidate
    // is excluded by visibility, not by a facet).
    const narrowed = applyFleetFilters(FIXTURE_FLEET, {
      ...EMPTY_FILTERS, family: ['momentum'], timeframe: ['H1'],
    })
    expect(narrowed.map(b => b.slug)).toEqual(['macdvolume-bf11'])
  })

  it('keeps a dormant bot: zero trades is not a reason to hide a deployed bot', () => {
    const kept = applyFleetFilters(FIXTURE_FLEET, { ...EMPTY_FILTERS, family: ['trend'] })
    expect(kept.map(b => b.slug)).toContain('ichimoku-bf25')
  })

  it('matches the base asset exactly, so BTC does not swallow WBTC', () => {
    const got = applyFleetFilters(FIXTURE_FLEET, { ...EMPTY_FILTERS, asset: ['btc'] })
    expect(got.length).toBeGreaterThan(0)
    const wrapped = [mkBot({ slug: 'wbtc-bot', assets: ['WBTC'] })]
    expect(applyFleetFilters(wrapped, { ...EMPTY_FILTERS, asset: ['BTC'] })).toEqual([])
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
    expect(activeFilterCount({ ...EMPTY_FILTERS, family: ['trend', 'carry'], timeframe: ['H4'] })).toBe(3)
  })

  it('does not count sort as a filter', () => {
    expect(activeFilterCount({ ...EMPTY_FILTERS, sort: 'pnl', dir: 'asc' })).toBe(0)
  })
})

describe('describeEmptyResult', () => {
  it('is null while results remain', () => {
    expect(describeEmptyResult(FIXTURE_FLEET, EMPTY_FILTERS)).toBeNull()
  })

  it('names the single facet that emptied the list', () => {
    // carry alone leaves the funding bot (H8); M15 then empties the list, so
    // M15 is the facet to blame.
    const state = { ...EMPTY_FILTERS, family: ['carry'] as never, timeframe: ['M15'] }
    const msg = describeEmptyResult(FIXTURE_FLEET, state)
    expect(msg).not.toBeNull()
    expect(msg).toContain('M15')
  })

  it('still answers when the very first facet empties the list', () => {
    const lonely = [mkBot({ family: 'trend', timeframe: 'H4' })]
    const state = { ...EMPTY_FILTERS, family: ['carry'] as never }
    expect(describeEmptyResult(lonely, state)).toBeTruthy()
  })
})
