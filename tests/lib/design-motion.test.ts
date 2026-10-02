// tests/lib/design-motion.test.ts
//
// Refonte « Le registre des décisions », lot 1 (2026-10-02): prefers-reduced-motion
// is honoured site-wide (globals.css), and every looping animation in src/ carries
// `motion-reduce:animate-none` beside it, so a skeleton or a pulse stands still
// for a reader who asked for no motion.
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = join(__dirname, '..', '..')

function tsx(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) tsx(p, out)
    else if (p.endsWith('.tsx')) out.push(p)
  }
  return out
}

describe('reduced motion', () => {
  it('globals.css stops animations and transitions under prefers-reduced-motion', () => {
    const css = readFileSync(join(ROOT, 'src/app/globals.css'), 'utf8')
    const block = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(block).toMatch(/animation-duration:\s*0\.01ms !important/)
    expect(block).toMatch(/transition-duration:\s*0\.01ms !important/)
  })

  it('every animate-pulse / animate-spin in src/ sits beside motion-reduce:animate-none', () => {
    const offenders: string[] = []
    for (const f of tsx(join(ROOT, 'src'))) {
      readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        if (/\banimate-(?:pulse|spin|ping|bounce)\b/.test(line) && !line.includes('motion-reduce:animate-none')) {
          offenders.push(`${relative(ROOT, f)}:${i + 1}`)
        }
      })
    }
    expect(offenders).toEqual([])
  })
})
