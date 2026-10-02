// tests/app/one-main.test.ts
//
// Refonte « Le registre des décisions », lot 1 (2026-10-02), constat 22 of the
// design audit: fifteen routes rendered a <main> of their own inside the
// layout's <main id="contenu">, so a page had two main landmarks, one nested.
// The layout holds the only one; a page, a loading shell or a not-found starts
// with a <div> or an <article>.
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const APP = join(__dirname, '..', '..', 'src', 'app')

function tsx(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) tsx(p, out)
    else if (p.endsWith('.tsx')) out.push(p)
  }
  return out
}

describe('one <main> per page', () => {
  const files = tsx(APP)

  it('scans the app tree, loading shells included', () => {
    expect(files.some(f => f.endsWith('loading.tsx'))).toBe(true)
    expect(files.length).toBeGreaterThan(20)
  })

  it('renders <main> in the root layout only', () => {
    const withMain = files
      .filter(f => /<main[\s>]/.test(readFileSync(f, 'utf8').split('\n').filter(l => !/^\s*(\/\/|\*|\{\/\*)/.test(l)).join('\n')))
      .map(f => relative(APP, f).replace(/\\/g, '/'))
    expect(withMain).toEqual(['layout.tsx'])
  })

  it('gives the layout main the skip link target', () => {
    expect(readFileSync(join(APP, 'layout.tsx'), 'utf8')).toMatch(/<main id="contenu"/)
  })
})
