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

  it('has no BOT_PARAMS key that is not a published slug', () => {
    const published = new Set(publishedSlugs())
    const orphans = Object.keys(BOT_PARAMS).filter((k) => !published.has(k))
    expect(orphans).toEqual([])
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
