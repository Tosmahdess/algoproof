// src/components/mdx/cellKind.ts
//
// Shared cell-classification helpers for MDX tables (CompactTable.tsx and
// MDXComponents.tsx). A single source of truth: the old per-file copies used
// `/[+\-−]?\s*\d/.test(s)`, unanchored, so any cell containing a digit
// ANYWHERE ("Golden cross 50/200", "BTC 1j", "Ichimoku 9/26/52") was flagged
// numeric and rendered font-mono, nowrap, right-aligned — wrong for prose
// cells and the direct cause of the 700-900px min table width on phone.
//
// isNumeric is anchored (^...$) over the whole trimmed cell: a value counts
// as numeric only if the ENTIRE cell is a number, optionally signed, with an
// optional trailing unit. A sentence that happens to contain a digit no
// longer qualifies.

// One number: optional sign, digits with separators, optional unit.
const NUM = String.raw`[+−–-]?\s*\d[\d\s.,]*\s*(?:%|€|x|×|k|M|USDT|pb|bp|j|h|R)?`
// A cell is numeric if it is one number, or several joined by « / »
// (« 132 / 72 % / +978 » = n / WR / P&L in the hard-gate article).
const NUMERIC_CELL = new RegExp(String.raw`^${NUM}(?:\s*/\s*${NUM})*$`)

export function isNumeric(s: string): boolean {
  return NUMERIC_CELL.test(s.trim())
}

/** Detect sign for color coding.
 *  Returns 'positive' if the cell starts with a `+`;
 *  'negative' if it starts with a dash variant (−, –, -) followed by a digit;
 *  'neutral' otherwise. */
export function detectSign(s: string): 'positive' | 'negative' | 'neutral' {
  const trimmed = s.trim()
  if (/^[+]/.test(trimmed)) return 'positive'
  if (/^[−–-]\s*\d/.test(trimmed)) return 'negative'
  return 'neutral'
}
