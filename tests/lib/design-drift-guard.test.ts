// tests/lib/design-drift-guard.test.ts
//
// Visual-harmonisation pass of 2026-09-24: links were green, white or violet
// depending on the card, and prose paragraphs were white, grey or 80 % white
// depending on the page. The decision is two text colours (foreground, muted),
// one link system (src/lib/link-roles.ts) and green reserved for profit.
// This guard refuses the class spellings that produced the drift, anywhere in src/.
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SRC = join(__dirname, '..', '..', 'src')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return name === '__tests__' ? [] : walk(p)
    return /\.tsx?$/.test(name) ? [p] : []
  })
}

const BANNED: [RegExp, string][] = [
  [/(?<![\w:-])text-white\b/, 'text-white — use text-foreground'],
  [/hover:text-white\b/, 'hover:text-white — use a linkClass role or hover:text-foreground'],
  [/text-foreground\/\d+/, 'text-foreground/NN — prose is foreground or muted, nothing in between'],
  [/\b(?:text|bg|border)-zinc-\d+/, 'zinc-* — use the site tokens (border, card, foreground, muted)'],
  [/hover:border-positive/, 'hover:border-positive — green is profit, never a hover colour'],
  [/(?:group-)?hover:text-positive/, 'hover:text-positive — green is profit, never a hover colour'],
  [/text-\[(?:9|11|13|15)px\]/, 'arbitrary text size — use text-xs / text-sm'],
]

describe('design drift guard', () => {
  const files = walk(SRC)
  it('scans a non-trivial tree', () => {
    expect(files.length).toBeGreaterThan(100)
  })
  // Witness: each pattern must fire on the spelling it bans, or an empty hit
  // list proves nothing.
  it.each([
    ['className="text-white"', 0], ['className="a hover:text-white"', 1],
    ['text-foreground/80', 2], ['border-zinc-800', 3], ['hover:border-positive/30', 4],
    ['group-hover:text-positive', 5], ['text-[11px]', 6],
  ])('pattern fires on %s', (sample, idx) => {
    expect(BANNED[idx as number][0].test(sample as string)).toBe(true)
  })
  it('does not fire on the canonical spellings', () => {
    for (const ok of ['text-foreground', 'text-muted', 'group-hover:text-accent', 'text-[10px]', 'text-positive']) {
      expect(BANNED.some(([re]) => re.test(ok)), ok).toBe(false)
    }
  })
  for (const [re, why] of BANNED) {
    it(`no ${why.split(' — ')[0]}`, () => {
      const hits = files.flatMap((f) =>
        readFileSync(f, 'utf-8').split('\n')
          .map((line, i) => ({ line, i }))
          .filter(({ line }) => re.test(line) && !/^\s*(\/\/|\*)/.test(line))
          .map(({ i }) => `${f.slice(SRC.length + 1)}:${i + 1}`),
      )
      expect(hits, why).toEqual([])
    })
  }
})
