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
const TWIN_SHA256 = '139362e96ea3d0bdb82fa948161d54c7f9739164836a5b334294a4a6aeb4be08'

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
