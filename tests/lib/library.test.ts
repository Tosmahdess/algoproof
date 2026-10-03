import { describe, it, expect } from 'vitest'
import {
  ideaSlug, ideaKeyFromSlug, waitReasonLabel, variantState, filterLabel,
  sortIdeas, simSplit, simLine, variantNumber, sortVariants, type LibraryIdea, type LibraryVariant,
} from '@/lib/library'

// The library (chantier bibliotheque, lot 2, D079/D083): one card per idea
// (engine base x timeframe), its variants in a table. These are the pure rules the
// pages rest on.

const idea = (over: Partial<LibraryIdea>): LibraryIdea => ({
  idea_key: 'DonchianBreakout|H4', base: 'DonchianBreakout', tf: 'H4', family: 'breakout',
  n_variants: 10, n_backtest: 8, n_awaiting: 6, n_trailing: 2, n_not_surviving: 0,
  n_running: 2, n_live: 0, n_paper: 2, n_stopped: 0, n_sim_up: 0, n_sim_down: 0, n_sim_young: 2,
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

// Refonte « registre », page bibliothèque (2026-10-03, audit n° 42): the « n° k » is
// part of a variant's name, given once at publication. It orders the register inside
// each state, and the page says it is not a ranking.
describe('variant numbers and order', () => {
  const v = (over: Partial<LibraryVariant>): LibraryVariant => ({
    slug: 's', name: 'Canal ATR D1 Binance Futures n° 1', status: 'backtest', idea_key: 'ATRChannel|D1',
    idea_rank: 1, wait_reason: null, filter_keys: null, mtf_caveat: false, survivor_id: null, assets: null,
    found_at: null, paper_since: null, pf_backtest: null, n_trades_backtest: null, sim_trades: 0, sim_pnl: 0,
    ...over,
  })
  it('reads the number from the rank, else from the name, else none', () => {
    expect(variantNumber(v({ idea_rank: 12 }))).toBe(12)
    expect(variantNumber(v({ idea_rank: null, name: 'Cassure de volatilité (Williams) D1 Binance Futures n° 6' }))).toBe(6)
    expect(variantNumber(v({ idea_rank: null, name: 'Croisement EMA H4 Binance Futures' }))).toBeNull()
  })
  it('orders by state (real money, simulation, stopped, backtest only), then by number', () => {
    const rows = [
      v({ slug: 'b3', status: 'backtest', idea_rank: 3 }),
      v({ slug: 'p9', status: 'paper', idea_rank: 9 }),
      v({ slug: 'b1', status: 'backtest', idea_rank: 1 }),
      v({ slug: 'p2', status: 'paper', idea_rank: null, name: 'X n° 2' }),
      v({ slug: 'l', status: 'live', idea_rank: 40 }),
      v({ slug: 'a', status: 'archived', idea_rank: 5 }),
    ]
    expect(sortVariants(rows).map(r => r.slug)).toEqual(['l', 'p2', 'p9', 'a', 'b1', 'b3'])
  })
})

describe('simulation line of an idea', () => {
  it('says nothing when no variant runs', () => {
    expect(simLine(idea({ n_sim_up: 0, n_sim_down: 0, n_sim_young: 0 }))).toBeNull()
  })
  it('names only the parts that exist, and calls a flat result zero or below', () => {
    expect(simLine(idea({ n_sim_up: 0, n_sim_down: 0, n_sim_young: 3 }))).toBe('3 trop jeunes pour conclure')
    expect(simLine(idea({ n_sim_up: 0, n_sim_down: 0, n_sim_young: 1 }))).toBe('1 trop jeune pour conclure')
    expect(simLine(idea({ n_sim_up: 2, n_sim_down: 1, n_sim_young: 0 }))).toBe('2 au-dessus de zéro, 1 à zéro ou en dessous')
  })
})
