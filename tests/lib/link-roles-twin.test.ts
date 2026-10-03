import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// `link-roles.ts` is duplicated verbatim in the other repo — algoproof.fr and
// lab.algoproof.fr are one visual language across two deployments, and a
// 70-line module is not worth a shared package. The cost of that choice is
// that the two copies can drift apart, one link at a time, until the two sites
// stop matching and nobody can say which one is right.
//
// Neither repo can read the other, so the contract is this digest: both sides
// assert the SAME constant. Change one copy and its own suite goes red with the
// new digest to paste — into BOTH files, which is the moment you remember the
// twin exists.
//
// Line endings are normalised before hashing on purpose: these repos check out
// with CRLF on Windows and LF elsewhere, so hashing the raw bytes would fail on
// half the machines for a reason that has nothing to do with drift.
// Refonte registre, lot 1 (2026-10-02): the focus ring went from 2 px at 60 % to
// 3 px at full accent. The lab's copy has NOT followed yet: copy link-roles.ts
// there and paste this digest into its twin test.
// Finitions (2026-10-03): one comment of linkClass() said « green means profit »;
// it now says green belongs to the wordmark. Same pending copy to the lab, new digest.
const TWIN_SHA256 = 'd0d13e7e0be82bdce007bee46d0dfa04616d689455af7271aa03c0370a03e261'

describe('link-roles.ts and its twin in the other repo', () => {
  it('still matches the digest both sides assert', () => {
    const raw = readFileSync(join(__dirname, '..', '..', 'src', 'lib', 'link-roles.ts'), 'utf8')
    const digest = createHash('sha256').update(raw.replace(/\r\n/g, '\n')).digest('hex')

    expect(
      digest,
      'link-roles.ts changed. Copy it to the other repo and update TWIN_SHA256 in BOTH link-roles-twin tests.',
    ).toBe(TWIN_SHA256)
  })
})
