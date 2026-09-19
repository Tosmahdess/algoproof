// tests/lib/undeclared-color-classes.test.ts
//
// Pre-launch audit 2026-09-09: the only paid CTA of the site was rendered at
// 2,74:1 because its class was `text-background`. Tailwind v3 emits NO rule
// for a colour it does not know and warns about nothing: the button silently
// inherited the near-white foreground on the indigo accent. `bg-background`
// on four inputs was the same defect with a smaller cost (a transparent
// field instead of a dark one).
//
// The rule: a colour utility (text-/bg-/border-…) may only name a colour that
// exists — a token from tailwind.config.ts, a Tailwind default palette name,
// or an arbitrary value. Anything else is a class that does nothing, and
// this test lists it by file:line.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import tailwindConfig from '../../tailwind.config'

const DECLARED = new Set(Object.keys((tailwindConfig.theme?.extend?.colors ?? {}) as Record<string, string>))

// Tailwind's default palette families plus the four keyword colours.
const TAILWIND_DEFAULT = new Set([
  'inherit', 'current', 'transparent', 'black', 'white',
  'slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow',
  'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet',
  'purple', 'fuchsia', 'pink', 'rose',
])

// Non-colour utilities that share a prefix with the colour ones.
const NOT_A_COLOUR: Record<string, Set<string>> = {
  text: new Set(['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl',
    'left', 'right', 'center', 'justify', 'start', 'end', 'ellipsis', 'clip', 'wrap', 'nowrap',
    'balance', 'pretty']),
  bg: new Set(['none', 'cover', 'contain', 'auto', 'fixed', 'local', 'scroll', 'center', 'top', 'bottom',
    'left', 'right', 'repeat', 'clip', 'origin', 'gradient', 'opacity', 'blend']),
  border: new Set(['t', 'b', 'l', 'r', 'x', 'y', 's', 'e', 'solid', 'dashed', 'dotted', 'double', 'hidden',
    'none', 'collapse', 'separate', 'spacing', 'opacity', '0', '2', '4', '8']),
}

// `(?<!\[)`: an arbitrary PROPERTY such as `[text-transform:inherit]` is not a
// colour utility, whatever its property name starts with (false positive on
// Repli's button, 2026-09-19). `text-background`, `hover:text-foo` still match.
const CLASS_RE = /(?<!\[)\b(text|bg|border)-([a-z][a-z0-9]*)(?=[\s/'"`:\]}]|$)/g

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (entry.name.endsWith('.tsx')) out.push(full)
  }
  return out
}

describe('every colour utility in src/ names a colour that exists', () => {
  it('no text-/bg-/border- class names an undeclared colour', () => {
    const root = path.resolve(__dirname, '../../src')
    const offenders: string[] = []
    for (const file of walk(root)) {
      // Comments are prose, not classes: a comment that SAYS « bg-background
      // does not exist » must not trip the guard. Blanked rather than removed
      // so line numbers in the report stay right.
      const src = fs.readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, c => c.replace(/[^\n]/g, ' '))
        .replace(/^\s*\/\/.*$/gm, '')
      for (const m of src.matchAll(CLASS_RE)) {
        const [, prefix, name] = m
        if (DECLARED.has(name) || TAILWIND_DEFAULT.has(name) || NOT_A_COLOUR[prefix].has(name)) continue
        const line = src.slice(0, m.index).split('\n').length
        offenders.push(`${path.relative(root, file).replace(/\\/g, '/')}:${line} ${m[0]}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('the tokens this site writes with are declared (guards the config, not the pages)', () => {
    for (const t of ['bg', 'card', 'border', 'muted', 'positive', 'negative', 'accent', 'foreground', 'warning', 'severe']) {
      expect(DECLARED.has(t), t).toBe(true)
    }
    // `background` is the name people reach for, and it is NOT a token here.
    expect(DECLARED.has('background')).toBe(false)
  })
})
