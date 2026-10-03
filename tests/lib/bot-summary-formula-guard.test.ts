// tests/lib/bot-summary-formula-guard.test.ts
//
// bot_stats rows carry the FORMULA_REV they were computed with, and a list never serves
// a row of another revision (it recomputes live). That only protects anything if the
// revision MOVES when the formula does -- and nobody remembers to bump a constant three
// files away from the one they edited. This guard reads the SOURCE of every module the
// summary composes, not its behaviour: a behaviour test cannot see that yesterday's rows
// were computed by a different function (the 09/08 lesson on guards that read output).
//
// Comments and whitespace are stripped before hashing, so rewording a comment does not
// train anyone to bump reflexively.
//
// When this fails: bump FORMULA_REV in src/lib/bot-summary.ts, then paste the printed
// hash and the new revision into RECORDED below. After deploying, run the bot_stats job
// at once: until it runs, every list recomputes every bot live (the slow path).
import { describe, it, expect } from 'vitest'
import { createHash } from 'crypto'
import { readFileSync } from 'fs'
import path from 'path'
import { FORMULA_REV } from '@/lib/bot-summary'

const RECORDED = { rev: 1, hash: '61a58cf92307a4d9' }

const root = path.resolve(__dirname, '../..')
// CRLF on a Windows checkout, LF on Vercel: the hash must not depend on the machine.
const read = (f: string) => readFileSync(path.join(root, f), 'utf-8').replace(/\r\n/g, '\n')

/** The whole module, for the ones that are nothing but the formula. */
const WHOLE = [
  'src/lib/bot-summary.ts',
  'src/lib/bot-simulation.ts',
  'src/lib/backtest-segment.ts',
  'src/lib/stats.ts',
  'src/lib/register-slices.ts',
  'src/lib/start-capitals.ts',
  // how a segment row is parsed (the paperScaling default changes every engine bot)
  'src/lib/backtest-segment-data.ts',
]

/** queries.ts changes for many reasons: only the ledger arithmetic and the trade
 *  columns the summary is computed from are hashed. */
function queriesExcerpt(): string {
  const s = read('src/lib/queries.ts')
  const fn = s.indexOf('async function fetchBotWithStats(')
  const end = s.indexOf('\n}\n', fn)
  const cols = s.match(/const TRADE_COLUMNS_FLEET = [^\n]*/)
  if (fn < 0 || end < 0 || !cols) throw new Error('queries.ts: fetchBotWithStats or TRADE_COLUMNS_FLEET moved')
  return cols[0] + s.slice(fn, end)
}

/** home-data.ts: only the sparkline window, not its unrelated helpers. */
function last30Excerpt(): string {
  const s = read('src/lib/home-data.ts')
  const fn = s.indexOf('export function last30Capital(')
  const end = s.indexOf('\n}\n', fn)
  if (fn < 0 || end < 0) throw new Error('home-data.ts: last30Capital moved')
  return s.slice(fn, end)
}

function normalise(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // a line comment starts at a line start or after whitespace (keeps 'https://…')
    .replace(/(^|\s)\/\/[^\n]*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

function formulaHash(): string {
  const h = createHash('sha256')
  for (const f of WHOLE) h.update(f + '\0' + normalise(read(f)) + '\0')
  h.update('queries\0' + normalise(queriesExcerpt()))
  h.update('last30\0' + normalise(last30Excerpt()))
  return h.digest('hex').slice(0, 16)
}

describe('the bot_stats formula revision follows its sources', () => {
  it('FORMULA_REV and the sources hash were recorded together', () => {
    const hash = formulaHash()
    expect(
      { rev: FORMULA_REV, hash },
      `The summary's sources changed (hash ${hash}). Bump FORMULA_REV in src/lib/bot-summary.ts, `
        + 'record { rev, hash } here, and run the bot_stats job right after the deploy.',
    ).toEqual(RECORDED)
  })

  it('ignores comments and layout', () => {
    expect(normalise('const a = 1 // why\n/* long\n why */  const b =\n 2'))
      .toBe(normalise('const a = 1\nconst b = 2'))
    expect(normalise("const u = 'https://algoproof.fr'")).toContain('https://algoproof.fr')
  })
})
