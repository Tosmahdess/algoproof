// tests/app/prose-template.test.ts
//
// Lot 7 of the design audit (spec 5.9, C12, 2026-09-25): the prose pages share
// ONE template. Five widths and three paddings existed before; the reader felt
// the page change shape between /preuve and /start.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '../..')
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8')

const PROSE_PAGES = [
  'src/app/preuve/page.tsx',
  'src/app/lexique/page.tsx',
  'src/app/faq/page.tsx',
  'src/app/mica/page.tsx',
  'src/app/start/page.tsx',
  'src/app/a-propos/page.tsx',
]

const mainClass = (src: string) => {
  const m = src.match(/<main className="([^"]*)"/)
  if (!m) throw new Error('no <main className="…">')
  return m[1].split(/\s+/)
}

describe('the prose template', () => {
  it.each(PROSE_PAGES)('%s uses max-w-3xl px-6 py-12 on its <main>', (f) => {
    const cls = mainClass(read(f))
    for (const c of ['max-w-3xl', 'px-6', 'py-12']) expect(cls, f).toContain(c)
    expect(cls, f).not.toContain('py-16')
  })

  it.each(PROSE_PAGES)('%s sets its h1 at 30 px (text-3xl)', (f) => {
    const src = read(f)
    const h1 = src.match(/<h1 className="([^"]*)"/)
    expect(h1, `${f}: h1`).toBeTruthy()
    expect(h1![1].split(/\s+/)).toContain('text-3xl')
  })

  // Body copy is 15 px (text-base). `text-sm` stays for captions, notes and
  // table cells; a paragraph of running prose is not a caption.
  it.each(['src/app/preuve/page.tsx', 'src/app/start/page.tsx', 'src/app/mica/page.tsx'])(
    '%s writes its running prose at 15 px, not 14',
    (f) => {
      expect(read(f)).not.toMatch(/className="text-sm leading-relaxed/)
    },
  )
})

describe('/preuve', () => {
  it('makes « Un backtest gagnant ne prouve rien » the h2 of its method section', () => {
    const src = read('src/app/preuve/page.tsx')
    const validation = src.slice(src.indexOf('id="validation"'), src.indexOf('id="pertes"'))
    expect(validation).toMatch(/<h2[^>]*>Un backtest gagnant ne prouve rien<\/h2>/)
    expect(src).not.toMatch(/Comment je valide une stratégie/)
    // the sentence left the intro: it is the heading now, not a repeat
    expect(src).not.toMatch(/Un backtest qui gagne ne prouve rien/)
  })
})
