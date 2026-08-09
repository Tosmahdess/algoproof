import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const page = readFileSync('src/app/intelligence/page.tsx', 'utf8')

describe('/intelligence hero', () => {
  // The gate blocked 0 signals over the whole measured window. An absolute claim about
  // it, sitting above a section that reports exactly that, makes the page contradict
  // itself.
  it('does not claim the blackout is an operating reality', () => {
    expect(page).not.toMatch(/sans exception/i)
    expect(page).not.toMatch(/aucun bot ne trade/i)
  })

  it('uses no em dash in the hero copy', () => {
    const hero = page.slice(page.indexOf('Le gardien qui ne dort jamais'), page.indexOf('Live regime'))
    expect(hero).not.toMatch(/[—–]/)
  })
})
