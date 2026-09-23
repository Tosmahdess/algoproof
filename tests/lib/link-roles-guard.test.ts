import { describe, it, expect } from 'vitest'
import ts from 'typescript'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// The guard that makes the link system a system instead of a one-off tidy-up.
//
// This repo has a documented habit of drift coming back: src/lib/funnel.ts
// carries the story of its own 2026-08-15 miscount in its header, and the same
// two surfaces drifted again on 2026-09-22. A comment describing a past drift
// does not prevent the next one — only a shared check does.
//
// It parses the JSX rather than grepping the text, for two reasons. A className
// written over several lines, or built with a template literal, is invisible to
// a regex over source lines. And a grep is satisfied by a mention in a COMMENT,
// which is exactly how a guard ends up green while the defect is present.
//
// Buttons and CTAs are deliberately NOT part of the link system: a <Link>
// dressed as a button takes the button's colours. That is why `text-positive`
// is only refused when it is a TEXT colour — beside `border-` or `bg-` it is a
// button, and a button may be green.

const ROOT = join(__dirname, '..', '..')
const LINK_TAGS = new Set(['Link', 'a', 'TrackedLink'])

function tsxFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) tsxFiles(p, out)
    else if (p.endsWith('.tsx') && !/__tests__|\.test\./.test(p)) out.push(p)
  }
  return out
}

interface Violation { where: string; tag: string; why: string; cls: string }

function violations(): Violation[] {
  const found: Violation[] = []

  for (const file of tsxFiles(join(ROOT, 'src'))) {
    const text = readFileSync(file, 'utf8')
    const src = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

    const visit = (node: ts.Node): void => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(src)
        if (LINK_TAGS.has(tag)) {
          const attr = node.attributes.properties.find(
            (p): p is ts.JsxAttribute => ts.isJsxAttribute(p) && p.name.getText(src) === 'className',
          )
          const cls = attr?.initializer ? attr.initializer.getText(src) : ''
          const line = src.getLineAndCharacterOfPosition(node.getStart(src)).line + 1
          const where = `${relative(ROOT, file).replace(/\\/g, '/')}:${line}`
          const flat = cls.replace(/\s+/g, ' ')

          // Goes through the system: nothing to check, the roles are tested.
          if (!cls.includes('linkClass(')) {
            if (/text-accent|underline/.test(cls)) {
              found.push({ where, tag, cls: flat, why: 'dressed by hand — use linkClass(role)' })
            } else if (/text-positive/.test(cls) && !/border-|bg-/.test(cls)) {
              found.push({ where, tag, cls: flat, why: 'green is profit on this site, never a link colour' })
            }
          }
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(src)
  }
  return found
}

describe('every link goes through the role system', () => {
  it('finds links to check at all (the guard is not scanning an empty tree)', () => {
    // Without this, deleting src/ or breaking the walker would turn the guard
    // below green — a check that inspects nothing always passes.
    expect(tsxFiles(join(ROOT, 'src')).length).toBeGreaterThan(30)
  })

  it('leaves none dressed by hand', () => {
    const bad = violations()
    const report = bad.map(v => `  ${v.where} <${v.tag}> ${v.why}\n      ${v.cls}`).join('\n')
    expect(report, `${bad.length} lien(s) hors du système :\n${report}`).toBe('')
  })
})
