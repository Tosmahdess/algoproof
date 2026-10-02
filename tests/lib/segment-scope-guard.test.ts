// tests/lib/segment-scope-guard.test.ts
//
// R1 (never merge backtest and paper in one figure) has two deliberate exceptions, asked
// by the user (D071): the curve header « depuis le 1er janvier » and the capital
// simulator. The whole-curve series (timelinePerfDaily) must stay confined to them: no
// ranking, badge, sort or other surface may read it. And every figure of the bot page
// reads the simulation through lib/bot-simulation (D072), never bot.stats directly.
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

function files(dir: string): string[] {
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : []
  })
}

describe('the whole-curve series stays where the user asked for it', () => {
  it('is imported by the bot page alone', () => {
    const users = files('src').filter(f => /timelinePerfDaily/.test(readFileSync(f, 'utf8')))
      .map(f => f.split('\\').join('/'))
    expect(users.sort()).toEqual([
      'src/app/strategies/bot/[slug]/page.tsx',
      'src/lib/backtest-segment.ts',
    ])
  })
})

describe('the bot page reads its figures through the shared simulation', () => {
  it('uses bot.stats only as the fallback of the simulation', () => {
    // the fiche, its OG image, and the two shares the fiche offers (Fable review, 29/09:
    // card and embed still read the ledger alone while the fiche showed the simulation)
    for (const f of ['src/app/strategies/bot/[slug]/page.tsx',
      'src/app/strategies/bot/[slug]/opengraph-image.tsx',
      'src/app/api/card/[slug]/route.tsx',
      'src/app/embed/[slug]/route.ts']) {
      const code = readFileSync(f, 'utf8').split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l))
      const uses = code.filter(l => l.includes('bot.stats'))
      expect(uses.length).toBeGreaterThan(0)          // non-vacuous: the fallback exists
      for (const l of uses) expect(l).toMatch(/\?\? bot\.stats/)
    }
  })
})
