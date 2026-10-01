import { describe, it, expect } from 'vitest'
import {
  ideaSlug, ideaKeyFromSlug, waitReasonLabel, variantState, filterLabel,
  sortIdeas, simSplit, type LibraryIdea,
} from '@/lib/library'

// The library (chantier bibliotheque, lot 2, D079/D083): one card per idea
// (engine base x timeframe), its variants in a table. These are the pure rules the
// pages rest on.

const idea = (over: Partial<LibraryIdea>): LibraryIdea => ({
  idea_key: 'DonchianBreakout|H4', base: 'DonchianBreakout', tf: 'H4', family: 'breakout',
  n_variants: 10, n_backtest: 8, n_awaiting: 6, n_trailing: 2, n_not_surviving: 0,
  n_running: 2, n_stopped: 0, n_sim_up: 0, n_sim_down: 0, n_sim_young: 2,
  pf_q1: 1.1, pf_median: 1.2, pf_q3: 1.35, n_pf: 8, last_found_at: '2026-09-20T00:00:00Z',
  ...over,
})

describe('idea slugs', () => {
  it('are lower-case base-tf and come back to the same key', () => {
    expect(ideaSlug('ZScoreReversal|H4')).toBe('zscorereversal-h4')
    expect(ideaKeyFromSlug('zscorereversal-h4', ['ZScoreReversal|H4', 'RSI2|D1'])).toBe('ZScoreReversal|H4')
  })
  it('return null for a slug no idea has', () => {
    expect(ideaKeyFromSlug('nothing-h4', ['RSI2|D1'])).toBeNull()
  })
})

describe('variant state and wait reasons', () => {
  it('says why a never-launched survivor waits, in plain French', () => {
    expect(waitReasonLabel('awaiting_validation')).toMatch(/attente/i)
    expect(waitReasonLabel('trailing_unsupported')).toMatch(/stop suiveur/i)
    expect(waitReasonLabel('not_surviving')).toMatch(/plus/i)
  })
  it('never calls a backtest-only survivor a paper bot', () => {
    expect(variantState({ status: 'backtest' })).toBe('Backtest seul')
    expect(variantState({ status: 'paper' })).toBe('En simulation')
    expect(variantState({ status: 'live' })).toBe('Argent réel')
    expect(variantState({ status: 'archived' })).toBe('Arrêtée')
  })
  it('prints filter names, never a raw key when a label exists', () => {
    expect(filterLabel('adx_min')).toBe('Force de tendance minimale')
    expect(filterLabel('hurst')).toBe('Régime de persistance')
    expect(filterLabel('unknown_key')).toBe('unknown_key')
  })
})

describe('simulation split', () => {
  it('counts only variants old enough as up or down', () => {
    const s = simSplit(idea({ n_sim_up: 3, n_sim_down: 1, n_sim_young: 4 }))
    expect(s).toEqual({ up: 3, down: 1, young: 4, total: 8 })
  })
})

describe('sorting', () => {
  const a = idea({ idea_key: 'A|H4', base: 'A', n_variants: 5, last_found_at: '2026-09-10T00:00:00Z' })
  const b = idea({ idea_key: 'B|D1', base: 'B', n_variants: 50, last_found_at: '2026-09-28T00:00:00Z' })
  const c = idea({ idea_key: 'C|H1', base: 'C', n_variants: 5, last_found_at: '2026-09-28T00:00:00Z' })
  it('recent first, then most variants, then alphabetical', () => {
    expect(sortIdeas([a, b, c], 'recent').map(i => i.base)).toEqual(['B', 'C', 'A'])
    expect(sortIdeas([a, b, c], 'size').map(i => i.base)).toEqual(['B', 'A', 'C'])
    expect(sortIdeas([c, b, a], 'az').map(i => i.base)).toEqual(['A', 'B', 'C'])
  })
})
