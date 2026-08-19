import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { BOT_PARAMS } from '@/lib/bot-params'

// The producer side of the invariant. BOT_PARAMS is consumed by a strict
// lookup (getBotParams -> BOT_PARAMS[slug] ?? null), so a key that does not
// match a published slug silently renders nothing. A fixture written here by
// hand would stay green whatever the publisher emits, so we read the
// publisher instead.
//
// Caveat, measured 2026-08-17: this reads THE REPO'S COPY of the publisher,
// which is known to have diverged from the file that actually runs in
// production (~/algoproof_sync.py on the server). The two carry different
// slug sets and different code, so this file is the authority on what this
// repo intends to publish, not on what the live database currently holds.
// Reconciling the two is a separate job, recorded in the vault.
function publishedSlugs(): string[] {
  const src = readFileSync(join(process.cwd(), 'scripts', 'vps_sync.py'), 'utf8')
  const out = new Set<string>()
  for (const m of src.matchAll(/"slug":\s*"([a-z0-9-]+)"/g)) out.add(m[1])
  return [...out]
}

describe('BOT_PARAMS keys vs published bot slugs', () => {
  it('reads a non-trivial number of slugs from the publisher', () => {
    // Guard: if the regex ever stops matching, every assertion below would
    // pass vacuously. This is the fixture-produces-nothing failure mode.
    // A count threshold alone is weak (a regex matching the wrong literal
    // could still clear 20), so pin one slug that must be in the set.
    const published = publishedSlugs()
    expect(published.length).toBeGreaterThan(20)
    expect(published).toContain('v1-spot')
  })

  // Documented ahead of publication (task 10, 2026-08-19): the armada wave
  // engine's free-sample fiche (arm-emacross-h4-head00) needs a real
  // BOT_PARAMS entry for the gated-block demo to have something to point at,
  // and this repo's copy of scripts/vps_sync.py has no reason to know about a
  // bot the engine hasn't promoted to the live sync config yet. This is the
  // mirror image of PENDING_FICHE below (a slug published without a fiche);
  // here the fiche exists before the slug is published.
  const PENDING_PUBLISH = new Set(['arm-emacross-h4-head00'])

  it('carries the free-sample entry for the wave engine', () => {
    // Leak-check lesson, 2026-08-18: pin the entry's existence explicitly, not
    // just its absence from the orphan-key list below — a key that silently
    // stopped existing would pass every other assertion in this file
    // vacuously.
    expect(BOT_PARAMS['arm-emacross-h4-head00']).toBeDefined()
  })

  it('has no BOT_PARAMS key that is not a published slug or a pending publish', () => {
    const published = new Set(publishedSlugs())
    const orphans = Object.keys(BOT_PARAMS).filter(
      (k) => !published.has(k) && !PENDING_PUBLISH.has(k),
    )
    expect(orphans).toEqual([])
  })

  it('does not carry a stale pending-publish exemption', () => {
    // Same expiry discipline as PENDING_FICHE below, mirrored: once
    // scripts/vps_sync.py picks the slug up, this entry becomes dead weight
    // that would mask the next real orphan key.
    const published = new Set(publishedSlugs())
    const stale = [...PENDING_PUBLISH].filter((s) => published.has(s))
    expect(stale).toEqual([])
  })

  // Bots that are published without a fiche, knowingly. The page degrades
  // gracefully for these (it renders "Paramètres techniques en cours de
  // documentation"), so this is an undocumented bot rather than a defect — but
  // it is a debt, not a design, and the test below makes each entry expire.
  //
  // funding-rev-long: surfaced 2026-08-17 when the repo's copy of the publisher
  // was reconciled with the one actually running on the server, which had been
  // ahead by this bot. Writing its fiche means auditing its claims first, which
  // is the whole lesson of that session. Tracked in the vault's FUTURE_CHECKS.
  const PENDING_FICHE = new Set(['funding-rev-long'])

  it('has a BOT_PARAMS entry for every published slug', () => {
    // The other direction, and the one the two dead keys were hiding. An
    // orphan key renders nothing extra; a MISSING key makes the fiche fall
    // back to "Paramètres techniques en cours de documentation" with no
    // signal that an entry was ever meant to exist.
    //
    // Keys are enumerated through Object.keys rather than by grepping the
    // source, so both quoting styles used in bot-params.ts (double-quoted
    // "v1-spot", single-quoted 'grid-btc-spot') are covered identically.
    const keys = new Set(Object.keys(BOT_PARAMS))
    const undocumented = publishedSlugs().filter(
      (s) => !keys.has(s) && !PENDING_FICHE.has(s),
    )
    expect(undocumented).toEqual([])
  })

  it('does not carry a stale pending-fiche exemption', () => {
    // An exemption must expire on its own. If a pending bot gains a fiche, or
    // stops being published, the entry here is dead weight that would mask the
    // next real gap — so fail until it is removed.
    const published = new Set(publishedSlugs())
    const keys = new Set(Object.keys(BOT_PARAMS))
    const stale = [...PENDING_FICHE].filter((s) => !published.has(s) || keys.has(s))
    expect(stale).toEqual([])
  })

  it('resolves the two non-crypto bots by their published slug', () => {
    expect(BOT_PARAMS['keltner-xau-hl']).toBeDefined()
    expect(BOT_PARAMS['emacross-eur-usd']).toBeDefined()
  })
})
