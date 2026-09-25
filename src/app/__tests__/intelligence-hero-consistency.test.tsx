import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const page = readFileSync('src/app/intelligence/page.tsx', 'utf8')

// Only what a reader can see: JSX text nodes and the metadata strings. Code
// identifiers (enum keys in a colour map) are not copy.
const copy = [
  ...page.matchAll(/>([^<>{}]+)</g),
  ...page.matchAll(/(?:title|description):\s*'((?:[^'\\]|\\.)*)'/g),
].map(m => m[1]).join('\n')

describe('/intelligence hero', () => {
  // The gate blocked 0 signals over the whole measured window. An absolute claim about
  // it, sitting above a section that reports exactly that, makes the page contradict
  // itself.
  it('does not claim the blackout is an operating reality', () => {
    expect(page).not.toMatch(/sans exception/i)
    expect(page).not.toMatch(/aucun bot ne trade/i)
  })

  it('uses no em dash in the hero copy', () => {
    const hero = page.slice(page.indexOf('<h1'), page.indexOf('<MiRegimeBadge'))
    expect(hero.length).toBeGreaterThan(0)
    expect(hero).not.toMatch(/[—–]/)
  })

  // One state, one word (spec §4): the regime is Calme / Tendu / Stress, the word of
  // the lexicon. « Risque ON/OFF », « NEUTRAL » and « Trading autorisé » are the
  // machine's vocabulary and leave the served copy, the <title> included.
  it('writes no machine vocabulary for the regime, metadata included', () => {
    expect(copy).not.toMatch(/NEUTRAL|GREED|FEAR/)
    expect(copy).not.toMatch(/risque\s+ON|risque\s+OFF/i)
    expect(copy).not.toMatch(/Trading autorisé/)
  })

  it('has no paragraph of prose between the h1 and the regime badge', () => {
    const hero = page.slice(page.indexOf('<h1'), page.indexOf('<MiRegimeBadge'))
    expect(hero).not.toMatch(/<p\b/)
  })
})
