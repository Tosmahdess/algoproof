import { describe, it, expect } from 'vitest'
import { fleetEntryAppliesTo, botVenue, scopeLabel } from '@/lib/changelog'
import type { Bot, BotChangelog } from '@/lib/types'

const bot = (o: Partial<Bot> = {}): Bot => ({
  id: '1', slug: 'apex-emacross-hl', name: 'EMA HL', strategy: 'ema',
  status: 'paper', family: 'trend', exchange: 'Hyperliquid', assets: ['BTC'],
  timeframe: 'H4', description: null, created_at: '', last_sync_at: null,
  start_capital: 1000, ...o,
})

const entry = (o: Partial<BotChangelog> = {}): BotChangelog => ({
  id: '1', created_at: '', scope_type: 'fleet', bot_slug: null,
  applies_to: 'all', entry_date: '2026-06-02', category: 'deploy',
  summary: 'Hard-Gate', detail: null, session_ref: null, ...o,
})

describe('fleetEntryAppliesTo', () => {
  it('non-fleet entries never apply', () => {
    expect(fleetEntryAppliesTo(entry({ scope_type: 'bot' }), bot())).toBe(false)
  })
  it('applies_to=all matches every bot', () => {
    expect(fleetEntryAppliesTo(entry({ applies_to: 'all' }), bot())).toBe(true)
  })
  it('family target matches same family only', () => {
    expect(fleetEntryAppliesTo(entry({ applies_to: 'family:trend' }), bot({ family: 'trend' }))).toBe(true)
    expect(fleetEntryAppliesTo(entry({ applies_to: 'family:trend' }), bot({ family: 'breakout' }))).toBe(false)
  })
  it('venue target matches normalized venue', () => {
    expect(fleetEntryAppliesTo(entry({ applies_to: 'venue:hl' }), bot({ exchange: 'Hyperliquid' }))).toBe(true)
    expect(fleetEntryAppliesTo(entry({ applies_to: 'venue:hl' }), bot({ exchange: 'Binance Spot' }))).toBe(false)
  })
  it('slug target matches listed slugs', () => {
    expect(fleetEntryAppliesTo(entry({ applies_to: 'slug:a,apex-emacross-hl' }), bot())).toBe(true)
    expect(fleetEntryAppliesTo(entry({ applies_to: 'slug:a,b' }), bot())).toBe(false)
  })
})

describe('botVenue', () => {
  it('normalizes exchange names to short codes', () => {
    expect(botVenue(bot({ exchange: 'Hyperliquid Perps' }))).toBe('hl')
    expect(botVenue(bot({ exchange: 'Binance Spot' }))).toBe('binance')
    expect(botVenue(bot({ exchange: 'OANDA' }))).toBe('oanda')
  })
})

describe('scopeLabel', () => {
  it('uses bot_slug for bot scope', () => {
    expect(scopeLabel(entry({ scope_type: 'bot', bot_slug: 'v1-spot' }))).toBe('v1-spot')
  })
  it('uses human label for non-bot scopes', () => {
    expect(scopeLabel(entry({ scope_type: 'fleet' }))).toBe('Flotte')
    expect(scopeLabel(entry({ scope_type: 'mi' }))).toBe('Intelligence')
    expect(scopeLabel(entry({ scope_type: 'wealth' }))).toBe('Patrimoine')
  })
})
