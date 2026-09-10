// tests/lib/copy-guards.test.ts
//
// Pre-launch audit 2026-09-09: the site described the same paid offer three
// different ways (« quatre parties », « sélection du jour », « deux
// paragraphes »), while the code sells exactly two fields (`lecture`,
// `risques`, see src/app/api/investir/[slug]/recit/route.ts). These guards
// sweep src/ and content/ for the phrases the audit retired, so a copy/paste
// cannot bring the old offer back on a page nobody re-reads.
//
// Each guard here is a CLASS rule over the whole tree, not a check on the one
// file the audit happened to name. The positive counterpart (the canonical
// sentence must exist somewhere) keeps the negative one from passing on an
// empty site.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '../..')
const TEXT_EXT = new Set(['.ts', '.tsx', '.mdx', '.md'])

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      walk(full, out)
    } else if (TEXT_EXT.has(path.extname(entry.name)) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

const FILES = [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'content'))]
const read = (f: string) => fs.readFileSync(f, 'utf8')
const rel = (f: string) => path.relative(ROOT, f).replace(/\\/g, '/')

/** Files whose text matches `re`, as repo-relative paths. JSX wraps prose
 *  across indented lines, so whitespace runs are collapsed before matching:
 *  a sentence must be found whatever the line breaks, and a guard must not
 *  pass because a phrase was merely re-wrapped. */
function filesMatching(re: RegExp): string[] {
  return FILES.filter(f => re.test(read(f).replace(/\s+/g, ' '))).map(rel)
}

// JSX writes an apostrophe as &apos; or ’ as often as ', and a JS string
// literal escapes it as \'. Every phrase below is matched with the apostrophe
// class so a guard cannot pass on an encoding difference it did not mean to
// test.
const APOS = "(?:\\\\'|'|’|&apos;)"

describe('the paid Investir offer has one description', () => {
  const CANON = new RegExp(
    `deux paragraphes d${APOS}analyse par société : ce que ses chiffres veulent dire pour son métier, et ce qui peut mal tourner`,
  )

  it('« quatre parties » is gone from src/ and content/', () => {
    expect(filesMatching(/quatre parties/i)).toEqual([])
  })

  it('« sélection du jour » is gone from src/ and content/', () => {
    expect(filesMatching(/s[ée]lection du jour/i)).toEqual([])
  })

  it('the canonical sentence is on every surface that sells the offer', () => {
    const where = filesMatching(CANON)
    expect(where).toEqual(expect.arrayContaining([
      'src/app/preuve/page.tsx',
      'src/app/faq/page.tsx',
      'src/components/RecitInvestir.tsx',
    ]))
  })
})

// Audit §2.1: « aucune ne reste profitable » on the home and « Profitables
// sur 2 ans : 0 » in the article, while the article's own table gives the
// Ichimoku a PF of 1,02 and its prose « ces dix euros … cinq trades ». The
// claim now carried is the one the table supports: nine lose, the tenth
// makes ten euros on five trades.
describe('the ten-AI-strategies claim matches the article\'s own table', () => {
  const ARTICLE = 'content/blog/2026-07-11-10-strategies-ia-au-bulletin.mdx'
  const article = () => read(path.join(ROOT, ARTICLE))

  it('the table still says what the claim rests on (PF 1.02, five trades)', () => {
    expect(article()).toMatch(/Ichimoku[^\n]*\| 1\.02 \|[^\n]*5 meilleurs trades/)
  })

  it('no surface says « aucune ne reste profitable » or counts zero profitable', () => {
    expect(filesMatching(/aucune ne reste profitable/i)).toEqual([])
    expect(article()).not.toMatch(/label="Profitables sur 2 ans" value="0"/)
    expect(article()).not.toMatch(/z[ée]ro profitable/i)
  })

  it('the home and the article carry the nine-lose / ten-euros / five-trades claim', () => {
    const CLAIM = /neuf perdent[^.]*dixième gagne dix euros[^.]*cinq trades/i
    expect(filesMatching(CLAIM)).toEqual(expect.arrayContaining(['src/app/page.tsx']))
    expect(article()).toMatch(/dix euros[^.]*cinq trades/)
  })
})
