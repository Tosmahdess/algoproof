import { describe, it, expect } from 'vitest'
import { provenanceSentence, dossierHref } from '@/lib/provenance'
import { mkBot } from '../fixtures/bots'

describe('provenanceSentence', () => {
  it('tells the engine story with its three dates', () => {
    const s = provenanceSentence(mkBot({
      origin: 'engine',
      found_at: '2026-07-12T00:00:00Z',
      validated_at: '2026-07-15T00:00:00Z',
      paper_since: '2026-07-18T00:00:00Z',
    }))
    expect(s).toContain('12/07/2026')
    expect(s).toContain('15/07/2026')
    expect(s).toContain('18/07/2026')
    expect(s).toMatch(/recherche automatique/i)
  })

  it('tells the hand-deployed story without inventing a discovery date', () => {
    const s = provenanceSentence(mkBot({
      origin: 'manual', found_at: null, paper_since: '2026-04-26T00:00:00Z',
    }))
    expect(s).toContain('26/04/2026')
    expect(s).toMatch(/avant la recherche automatique/i)
    expect(s).not.toMatch(/trouvé/i)
  })

  it('mentions real money when the bot is live', () => {
    const s = provenanceSentence(mkBot({
      status: 'live', origin: 'manual', live_since: '2026-05-08T00:00:00Z',
    }))
    expect(s).toContain('08/05/2026')
    expect(s).toMatch(/argent réel/i)
  })

  it('says something true when every date is missing, rather than nothing', () => {
    const s = provenanceSentence(mkBot({
      origin: 'manual', found_at: null, paper_since: null, live_since: null,
    }))
    expect(s.length).toBeGreaterThan(0)
    expect(s).not.toContain('null')
    expect(s).not.toContain('Invalid')
  })

  it('never claims the engine found a bot that it did not', () => {
    for (const bot of [mkBot({ origin: 'manual' }), mkBot({ origin: 'manual', paper_since: null })]) {
      expect(provenanceSentence(bot)).not.toMatch(/recherche automatique le/i)
    }
  })
})

describe('dossierHref', () => {
  it('points at the cockpit dossier when the bot carries an engine key', () => {
    const href = dossierHref(mkBot({
      origin: 'engine', found_at: '2026-07-12T00:00:00Z',
      engine_unit_key: 'ATRChannel|H4|data_20260701|3',
    }))
    expect(href).toBe('https://lab.algoproof.fr/cockpit/dossier/ATRChannel')
  })

  it('is null for a hand-deployed bot, which has no dossier to link', () => {
    expect(dossierHref(mkBot({ origin: 'manual', engine_unit_key: null }))).toBeNull()
  })

  it('is null rather than broken when the key is malformed', () => {
    expect(dossierHref(mkBot({ origin: 'engine', found_at: '2026-01-01T00:00:00Z', engine_unit_key: '' }))).toBeNull()
  })
})
