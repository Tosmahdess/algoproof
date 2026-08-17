import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isFamily, familyLabel, familyColor } from '@/lib/families'

// familyLabel/familyColor throw on a family this repo does not know. That is
// deliberate (a silent undefined shipped a blank badge once). So every family
// the publisher writes must be one of the nine, or a page crashes on the
// first visit after a sync.
function publishedFamilies(): string[] {
  const src = readFileSync(join(process.cwd(), 'scripts', 'vps_sync.py'), 'utf8')
  const out = new Set<string>()
  for (const m of src.matchAll(/"family":\s*"([a-z-]+)"/g)) out.add(m[1])
  return [...out]
}

describe('every published family is renderable', () => {
  it('reads families from the publisher', () => {
    expect(publishedFamilies().length).toBeGreaterThan(0)
  })

  it('never throws on a published family', () => {
    for (const f of publishedFamilies()) {
      expect(isFamily(f)).toBe(true)
      expect(() => familyLabel(f as never)).not.toThrow()
      expect(() => familyColor(f as never)).not.toThrow()
    }
  })

  it('publishes the gold bot as breakout, matching its BOT_FAMILY', () => {
    const src = readFileSync(join(process.cwd(), 'scripts', 'vps_sync.py'), 'utf8')
    const line = src.split('\n').find((l) => l.includes('"slug": "keltner-xau-hl"'))
    expect(line).toBeDefined()
    expect(line).toContain('"family": "breakout"')
  })
})
