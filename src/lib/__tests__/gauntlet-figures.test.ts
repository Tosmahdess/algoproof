import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { gauntletFunnel, GAUNTLET_TRIALS } from '@/lib/gauntlet-explainer'

// count() groups thousands with U+202F, and a literal typed in this file may carry either
// that or a plain space. Strip EVERY space variant from both sides so the assertions test
// the figure, not the typography of whoever wrote them.
const flat = (s: string) => s.replace(/[  ]/g, ' ')
const digits = (s: string) => s.replace(/[\s  ]/g, '')
import { variantsPhrase, type SearchSpace } from '@/lib/engine-search-space'

// The real EMAcross D1 cell, read from the engine report on 2026-08-09.
const EMACROSS_D1: SearchSpace = {
  base: 'EMAcross', tf: 'D1',
  nParams: 66, nFilterConfigs: 17780, nExits: 31,
  nBehaviors: 2782865, nJudged: 20000,
}

const text = (space: SearchSpace | null) => flat(gauntletFunnel(space).join(' '))

describe('the funnel copy is derived, not written', () => {
  it('prints the engine counts it was given', () => {
    const t = text(EMACROSS_D1)
    expect(digits(t)).toContain('66')
    expect(digits(t)).toContain('17780')
    expect(digits(t)).toContain('31')
    expect(digits(t)).toContain('20000')
    expect(digits(t)).toContain('2782865')
  })

  // The point of the whole change: feed it different counts and the sentence must follow.
  // A hardcoded literal passes the test above and fails this one.
  it('follows the data when the search space changes', () => {
    const doubled = { ...EMACROSS_D1, nParams: 132, nJudged: 40000 }
    const t = text(doubled)
    expect(digits(t)).toContain('132')
    expect(digits(t)).toContain('40000')
    expect(digits(t)).not.toContain('66jeux')
    expect(t).not.toMatch(/66/)
  })

  it('derives the variant total rather than restating it', () => {
    // 66 x 17 780 x 31 = 36 377 880
    expect(variantsPhrase(EMACROSS_D1)).toContain('36')
    expect(variantsPhrase({ ...EMACROSS_D1, nParams: 6 })).not.toContain('36')
  })

  // A page whose argument is that its numbers can be trusted must not fall back to a stale
  // constant when the read fails. No figure beats a wrong figure.
  it('renders the sentences without figures when there is no data', () => {
    // « 11,4 Go » survit au repli et c'est VOULU : c'est un incident daté, pas une mesure
    // qui bouge. Tout le reste des chiffres doit avoir disparu.
    const t = text(null).replace('11,4 Go', '')
    expect(t).not.toMatch(/[0-9]/)
    expect(t).toContain('Prends l’EMA cross')
    expect(t).toContain('gantelet')
  })
})

describe('claims removed on 2026-08-09 stay removed', () => {
  const src = readFileSync('src/lib/gauntlet-explainer.ts', 'utf8')
  const copy = text(EMACROSS_D1) + GAUNTLET_TRIALS.map(t => t.plain).join(' ')

  // No published artifact carries this. It lives in a design document only, so it cannot be
  // derived — publishing it asserts a measurement nobody made.
  it('does not claim 94 % of rejects come from walk-forward', () => {
    expect(copy).not.toContain('94')
  })

  // No EMAcross H1 unit exists, and the H4 rate computed from cheap_gate_kills is 7,6 %,
  // not 2,9 % — the old numbers predate `dd` leaving the judge on 2026-08-06.
  it('does not quote cheap-gate pass rates', () => {
    expect(copy).not.toContain('2,9')
    expect(copy).not.toContain('1,2 %')
  })

  it('keeps the dated incident frozen, and says why in the source', () => {
    expect(copy).toContain('11,4 Go')
    expect(src).toMatch(/11,4 Go[\s\S]*(fig|frozen|FIG)/i)
  })
})
