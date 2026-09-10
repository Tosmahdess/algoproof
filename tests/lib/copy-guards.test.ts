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
