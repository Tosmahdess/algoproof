import { describe, it, expect } from 'vitest'
import { MI_PILLARS, scoreText, scaleText, allowedSides, ENTRY_FLOOR } from '@/lib/mi-pillars'

// Audit 2026-10, n° 9 and n° 46: the four pillars of the weather were listed three
// times (badge, chart, page) under two names for the same notion (« News » and
// « Actualités »), and coloured with the gain and loss tokens the wrong way round
// (Sentiment +48 in red, Actualités −6,1 in green). One list now, one French word per
// pillar, and the sign is carried by the text.
describe('MI_PILLARS', () => {
  it('names each pillar with one French word, never the English one', () => {
    expect(MI_PILLARS.map(p => p.label)).toEqual(['Sentiment', 'Dérivés', 'Actualités', 'Macro'])
    for (const p of MI_PILLARS) expect(p.label).not.toMatch(/news/i)
  })

  it('weighs the four pillars to a whole', () => {
    expect(MI_PILLARS.reduce((s, p) => s + p.weight, 0)).toBe(100)
  })

  it('carries no colour: a pillar is identified by its name, not by a gain or loss token', () => {
    for (const p of MI_PILLARS) expect(Object.keys(p)).not.toContain('color')
  })

  it('says in one short phrase what each pillar follows, in plain French', () => {
    for (const p of MI_PILLARS) {
      expect(p.follows.length).toBeGreaterThan(10)
      expect(p.follows).not.toMatch(/\b(MI|APEX|news|open interest|Long\/Short|funding)\b/i)
      expect(p.follows).not.toMatch(/[—–]/)
    }
  })

  it('writes the method in plain French, without the service names or dashes', () => {
    for (const p of MI_PILLARS) {
      expect(`${p.functional} ${p.technical}`).not.toMatch(/\bMI-\d|\bMI\b|APEX|\bnews\b|open interest|[—–]/i)
    }
  })
})

describe('scoreText', () => {
  it('carries the sign in the text: plus for a positive score, the real minus for a negative', () => {
    expect(scoreText(48)).toBe('+48,0')
    expect(scoreText(-6.1)).toBe('−6,1')
  })

  it('writes a rounded zero without a sign', () => {
    expect(scoreText(0)).toBe('0,0')
    expect(scoreText(-0.04)).toBe('0,0')
  })

  it('writes an absent score as a dash', () => {
    expect(scoreText(null)).toBe('—')
    expect(scoreText(undefined)).toBe('—')
  })
})

describe('scaleText', () => {
  // « score 14,5 » had no scale (n° 46): the scale is written.
  it('writes the scale of the score with real minus signs', () => {
    expect(scaleText()).toBe('sur une échelle de −100 à +100')
  })
})

describe('ENTRY_FLOOR', () => {
  it('is the published entry floor of the global score', () => {
    expect(ENTRY_FLOOR).toBe(-30)
  })
})

describe('allowedSides', () => {
  // « Longs Shorts » had no label (n° 46): the sides a bot may take, in words.
  it('names the sides a bot may take, in words', () => {
    expect(allowedSides(true, true)).toBe('à la hausse et à la baisse')
    expect(allowedSides(true, false)).toBe('à la hausse seulement')
    expect(allowedSides(false, true)).toBe('à la baisse seulement')
    expect(allowedSides(false, false)).toBe('aucun')
  })

  it('says nothing when the snapshot does not carry the sides', () => {
    expect(allowedSides(null, true)).toBeNull()
    expect(allowedSides(true, null)).toBeNull()
  })
})
