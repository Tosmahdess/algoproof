// tests/components/mdx/cellKind.test.ts
//
// Root cause fixed in cellKind.ts: the old isNumeric was unanchored
// (`/[+\-−]?\s*\d/.test(s)`), so it matched a digit ANYWHERE in the cell —
// "Golden cross 50/200", "BTC 1j", "Ichimoku 9/26/52" all came back numeric
// and got font-mono, nowrap, right-aligned, which is the direct cause of the
// 700-900px min table width on phone (D065-adjacent audit, 2026-09-24). The
// new isNumeric is anchored (^...$) over the whole trimmed cell: only a cell
// that IS a number (optionally signed, optional trailing unit) qualifies.
import { describe, it, expect } from 'vitest'
import { isNumeric } from '@/components/mdx/cellKind'

describe('isNumeric — whole-cell, anchored', () => {
  it.each([
    ['3'],
    ['0.89'],
    ['1.02'],
    ['+12 %'],
    ['−0,3 %'],
    ['-68 %'],
    ['132 / 72 % / +978'],
    ['53 / 7.5 % / −430'],
    ['50/200'],
  ])('%s is numeric', (value) => {
    expect(isNumeric(value)).toBe(true)
  })

  it.each([
    ['Golden cross 50/200'],
    ['BTC 1j'],
    ['Ichimoku 9/26/52'],
    ["n inférieur à 20 : rien n'est significatif"],
    ['06/04 → 01/05'],
    ['0 % (non imposable)'],
  ])('%s is NOT numeric (digits present but the cell is not a number)', (value) => {
    expect(isNumeric(value)).toBe(false)
  })
})
