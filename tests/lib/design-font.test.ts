// tests/lib/design-font.test.ts
//
// Refonte « Le registre des décisions », lot 1 (2026-10-02): one face for the
// site, Schibsted Grotesk, figures included. The copy the site loads is built by
// scripts/fonts/build_schibsted.py: the Google file widens the comma to a figure
// under `tnum`, and every French amount carries a comma.
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(__dirname, '..', '..')
const layout = readFileSync(join(ROOT, 'src/app/layout.tsx'), 'utf8')

describe('the site font', () => {
  it('loads the self-hosted Schibsted Grotesk as --font-sans, Inter is gone', () => {
    expect(layout).toMatch(/localFont\(\{\s*src: '\.\/fonts\/SchibstedGrotesk-wght\.woff2'/)
    expect(layout).toMatch(/weight: '400 700'/)
    expect(layout).toMatch(/variable: '--font-sans'/)
    expect(layout).not.toMatch(/\bInter\b/)
  })

  it('ships the font file and its licence', () => {
    const font = join(ROOT, 'src/app/fonts/SchibstedGrotesk-wght.woff2')
    expect(existsSync(font)).toBe(true)
    // wOF2 signature: a real woff2, not an LFS pointer or an HTML error page.
    expect(readFileSync(font).subarray(0, 4).toString('latin1')).toBe('wOF2')
    expect(statSync(font).size).toBeGreaterThan(20_000)
    expect(readFileSync(join(ROOT, 'src/app/fonts/SchibstedGrotesk-OFL.txt'), 'utf8')).toMatch(/SIL Open Font License/)
  })

  it('keeps JetBrains Mono for identifiers only, as --font-mono', () => {
    expect(layout).toMatch(/JetBrains_Mono\(/)
    expect(layout).toMatch(/variable: '--font-mono'/)
  })
})
