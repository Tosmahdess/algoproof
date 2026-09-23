import { describe, it, expect } from 'vitest'
import ts from 'typescript'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// External review, 2026-09-23: "le lexique est cliquable et dirige sur une
// nouvelle page c'est chiant". Four of them sat in one paragraph of « La
// flotte ».
//
// The rule this pins: a link to a SPECIFIC term (`/lexique#profit-factor`)
// belongs to TermPopover, which brings the definition to the reader. A link to
// the lexicon as a WHOLE (`/lexique`) stays an ordinary link — there is no one
// definition to show, and the page must keep its inbound links.
//
// Without this guard the next `/lexique#...` added in a paragraph is a silent
// return to the behaviour that was reported.
const ROOT = join(__dirname, '..', '..')
const EXEMPT = ['src/components/TermPopover.tsx']

function tsxFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next') continue
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) tsxFiles(p, out)
    else if (p.endsWith('.tsx') && !/__tests__|\.test\./.test(p)) out.push(p)
  }
  return out
}

function anchoredLexiconLinks(): string[] {
  const found: string[] = []
  for (const file of tsxFiles(join(ROOT, 'src'))) {
    const rel = relative(ROOT, file).split('\\').join('/')
    if (EXEMPT.includes(rel)) continue
    const src = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

    const visit = (node: ts.Node): void => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(src)
        if (tag === 'Link' || tag === 'a') {
          const href = node.attributes.properties.find(
            (p): p is ts.JsxAttribute => ts.isJsxAttribute(p) && p.name.getText(src) === 'href',
          )
          const value = href?.initializer?.getText(src) ?? ''
          if (/\/lexique#/.test(value)) {
            const line = src.getLineAndCharacterOfPosition(node.getStart(src)).line + 1
            found.push(`${rel}:${line} ${value.replace(/\s+/g, ' ')}`)
          }
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(src)
  }
  return found
}

describe('a link to one lexicon term', () => {
  it('has files to inspect at all', () => {
    expect(tsxFiles(join(ROOT, 'src')).length).toBeGreaterThan(30)
  })

  it('goes through TermPopover, never straight to the lexicon page', () => {
    const bad = anchoredLexiconLinks()
    expect(
      bad.join('\n'),
      `${bad.length} lien(s) vers un terme précis envoient encore le lecteur sur /lexique :\n${bad.join('\n')}`,
    ).toBe('')
  })
})
