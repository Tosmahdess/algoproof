import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { floorSharePct, shareOfJudged } from '@/lib/cockpit-share'

// `cockpit-share.ts` is a verbatim copy of algolab web/lib/cockpit-share.ts.
// The home's engine band (2026-09-24, owner) prints the same four figures as
// the top of lab.algoproof.fr/cockpit, and the two sites have already drifted
// twice on these exact counts (lib/funnel.ts header). Same contract as
// link-roles-twin.test.ts: the digest of the algolab copy is pinned here, so
// editing this file without copying it back goes red with the digest to paste.
const TWIN_SHA256 = '2ab7af8d56577f4a56ddf59d3c85de53f2ee667410195d38371158c515161efd'

describe('cockpit-share.ts and its twin in algolab', () => {
  it('still matches the digest of the algolab copy', () => {
    const raw = readFileSync(join(__dirname, '..', '..', 'src', 'lib', 'cockpit-share.ts'), 'utf8')
    const digest = createHash('sha256').update(raw.replace(/\r\n/g, '\n')).digest('hex')
    expect(
      digest,
      'cockpit-share.ts changed. Copy it to algolab web/lib/ and update TWIN_SHA256 here.',
    ).toBe(TWIN_SHA256)
  })

  it('floors, never rounds up', () => {
    expect(floorSharePct(856, 1000)).toBe(85)
    expect(shareOfJudged(856, 1000)).toBe('85 % des jugées')
  })

  it('says nothing rather than a false 0 %', () => {
    expect(shareOfJudged(2, 1000)).toBeNull()
    expect(shareOfJudged(5, 0)).toBeNull()
  })
})
