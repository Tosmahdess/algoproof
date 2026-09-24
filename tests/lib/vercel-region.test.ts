import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Measured 2026-09-23. The database is in eu-west-3 (Paris). Vercel had no
// region configured, so it used its default, iad1 (Washington). Every request
// entered at cdg1 (Paris), crossed to Washington to run the function, and the
// function then queried a database back in Paris — one Atlantic round trip per
// SQL call, and /overview makes up to ~360 of them on a cold cache.
//
// The gap this explains: the same page renders its whole document in 0.24 s
// served locally, where the function sits 95 ms from the database, against
// 1.47-2.76 s in production.
//
// This is pinned in a test rather than left in a config file because it is
// invisible: nothing fails, nothing logs, the page merely takes seconds. And
// the default is the wrong answer, so deleting the file silently restores the
// defect.
const ROOT = join(__dirname, '..', '..')

/** Region of the Supabase pooler, read from the connection string — the source
 *  of truth for where the data actually lives. */
function databaseRegion(): string | null {
  const env = readFileSync(join(ROOT, '.env.local'), 'utf8')
  return env.match(/aws-\d-([a-z]+-[a-z]+-\d)/)?.[1] ?? null
}

/** Vercel's region codes are city-based; the database's are AWS-style. This is
 *  the mapping for the only continents this project has ever been deployed in.
 *  A region that is not here is not "probably fine" — it is unreviewed. */
const SAME_CONTINENT: Record<string, string[]> = {
  'eu-west-3': ['cdg1', 'fra1', 'arn1', 'dub1', 'lhr1'],
  'eu-west-1': ['dub1', 'lhr1', 'cdg1', 'fra1'],
  'eu-central-1': ['fra1', 'cdg1', 'arn1'],
  'us-east-1': ['iad1', 'cle1'],
}

describe('the function runs beside its database', () => {
  it('declares a region at all, instead of taking Vercel default', () => {
    const cfg = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'))
    expect(cfg.regions, 'no region declared means iad1, which is 6000 km from the data').toBeDefined()
    expect(cfg.regions.length).toBeGreaterThan(0)
  })

  it('declares one on the same continent as the database', () => {
    const db = databaseRegion()
    expect(db, 'could not read the database region from .env.local').not.toBeNull()

    const allowed = SAME_CONTINENT[db!]
    expect(allowed, `no continent mapping for the database region ${db} — add one deliberately`).toBeDefined()

    const cfg = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'))
    for (const region of cfg.regions as string[]) {
      expect(allowed, `${region} is not beside a ${db} database`).toContain(region)
    }
  })
})
