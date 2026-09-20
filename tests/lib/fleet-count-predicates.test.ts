// tests/lib/fleet-count-predicates.test.ts
//
// Two implementations answer « how many bots are in service », and since
// 2026-09-20 they answer it on DIFFERENT PAGES:
//
//   - the home computes it in JS — getBots() drops ("frozen","backtest") at the
//     query, excludeArchived() drops 'archived', and splitCohorts() buckets the
//     rest as live | paper. `paper` is a COMPLEMENT (!== live && !== archived),
//     so it absorbs whatever it is handed.
//   - /overview and the OpenGraph card read `funnel_counts.n_promoted`, an
//     ALLOW-LIST in SQL: status in ('paper','live') — migration 020.
//
// They agree today for one reason only: BotStatus has five values, the query
// removes two, and the remaining three are exactly archived + paper + live.
// Add a sixth status in the database — 'candidate', 'shadow', anything — and
// the TypeScript union will not see it, `.not('status','in',…)` will let it
// through, and the complement will pile it into `paper`. The home would then
// say 93 where /overview and the link preview say 92: the very « two numbers,
// one population » defect this chantier was opened to remove, moved from
// inside one page to across two.
//
// This guard reads the three sources — the union, the query exclusion, the
// migration — and pins the set identity between them. It also proves it can
// fail, on a fixture carrying the extra status.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '../..')
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8')

/** Every value of the BotStatus union, from its declaration. */
function declaredStatuses(): string[] {
  const m = read('src/lib/types.ts').match(/export type BotStatus\s*=\s*([^\n]+)/)
  if (!m) throw new Error('BotStatus union not found in src/lib/types.ts')
  return [...m[1].matchAll(/'([a-z_]+)'/g)].map(x => x[1])
}

/** The statuses getBots()/getBotSlugs() refuse to return at all. */
function excludedByQuery(): string[] {
  const m = read('src/lib/queries.ts').match(/PUBLIC_STATUS_EXCLUSION\s*=\s*'\(([^)]*)\)'/)
  if (!m) throw new Error('PUBLIC_STATUS_EXCLUSION not found in src/lib/queries.ts')
  return [...m[1].matchAll(/"([a-z_]+)"/g)].map(x => x[1])
}

/** The statuses funnel_counts.n_promoted counts, from the migration itself. */
function countedByView(): string[] {
  const sql = read('supabase/migrations/020_funnel_counts.sql')
  const m = sql.match(/status in \(([^)]*)\)[^)]*\)::bigint\s+as n_promoted/)
  if (!m) throw new Error('n_promoted predicate not found in migration 020')
  return [...m[1].matchAll(/'([a-z_]+)'/g)].map(x => x[1])
}

/** What the home would count: everything the query returns, minus archived. */
function countedByHome(all: string[], excluded: string[]): string[] {
  return all.filter(s => !excluded.includes(s) && s !== 'archived').sort()
}

describe('the home and funnel_counts count the same bots', () => {
  it('reads three real sources, not a copy of them', () => {
    expect(declaredStatuses()).toEqual(
      expect.arrayContaining(['paper', 'live', 'backtest', 'frozen', 'archived']),
    )
    expect(excludedByQuery().sort()).toEqual(['backtest', 'frozen'])
    expect(countedByView().sort()).toEqual(['live', 'paper'])
  })

  // The identity that makes « 92 bots en service » on the home equal to
  // n_promoted on /overview and on the OG card.
  it('the home cohort and the SQL allow-list are the same set', () => {
    const home = countedByHome(declaredStatuses(), excludedByQuery())
    expect(home, `home counts ${home.join('+')}`).toEqual(countedByView().sort())
  })

  // Proof the guard fires: a sixth status that nobody excluded lands in the
  // home's `paper` complement and in no SQL bucket.
  it('fails when a status exists that only one side knows about', () => {
    const withExtra = [...declaredStatuses(), 'candidate']
    const home = countedByHome(withExtra, excludedByQuery())
    expect(home).toContain('candidate')
    expect(home).not.toEqual(countedByView().sort())
  })
})
