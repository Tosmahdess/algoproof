// The wave-1 bots were chosen by the August engine, whose execution had three
// known defects (audit 2026-09-10). Their recipes were replayed on the repaired
// execution contract on 2026-09-12 (vault: backtests_massive/audits/
// 2026-09-10-strategy-audit/c2). This module serves that replay to the fiche.
//
// User decision 2026-09-18: show the replay, never as a verdict, and mark
// NOTHING about the hard gates — those recipes will be judged again. The
// whitelist test below is what keeps a gate column from leaking in.
import { describe, it, expect } from 'vitest'
import { recipeReplayFor, RECIPE_REPLAY } from '@/lib/recipe-replay'
import { mkBot } from '../fixtures/bots'

describe('recipeReplayFor', () => {
  it('returns nothing for a hand-deployed bot', () => {
    expect(recipeReplayFor(mkBot({ slug: 'v1-spot', origin: 'manual', engine_unit_key: null }))).toBeNull()
  })

  it('returns nothing for an engine origin without a unit key', () => {
    expect(recipeReplayFor(mkBot({ slug: 'arm-x-h4-head00', origin: 'engine', engine_unit_key: null }))).toBeNull()
  })

  it('says "pending" for an engine bot the replay did not cover', () => {
    const view = recipeReplayFor(mkBot({
      slug: 'arm-notreplayed-h4-head00', origin: 'engine',
      engine_unit_key: 'HMAcross|H4|data_20260802|3',
    }))
    expect(view).toEqual({ state: 'pending' })
  })

  it('serves the replayed PF and trade count of the bot\'s own recipe', () => {
    const view = recipeReplayFor(mkBot({
      slug: 'arm-atrchannel-h4-head00', origin: 'engine',
      engine_unit_key: 'ATRChannel|H4|data_20260802|3',
    }))
    expect(view).toMatchObject({ state: 'replayed', pf: 2.2485, n: 245 })
  })
})

describe('recipe-replay.json — the published artefact', () => {
  it('covers exactly the 75 wave-1 heads published on the site', () => {
    expect(RECIPE_REPLAY.rows).toHaveLength(75)
    expect(new Set(RECIPE_REPLAY.rows.map(r => r.slug)).size).toBe(75)
    for (const r of RECIPE_REPLAY.rows) expect(r.slug).toMatch(/^arm-.+-head\d\d$/)
  })

  it('exports ONLY slug, base, tf, pf and n — no gate, no old-engine figure', () => {
    // A gate column here (assets_go, worst_quarter_pf, pass_*, loo_stable,
    // pf_traded_assets, end_of_data, verdict_report, pf_recorded…) would mark
    // the 19 recipes that lose a hard gate, which the user refused.
    for (const r of RECIPE_REPLAY.rows) {
      expect(Object.keys(r).sort()).toEqual(['base', 'n', 'pf', 'slug', 'tf'])
    }
  })

  it('keeps each row\'s timeframe consistent with its slug', () => {
    for (const r of RECIPE_REPLAY.rows) {
      expect(r.slug).toContain(`-${r.tf.toLowerCase()}-`)
    }
  })

  it('carries the provenance of the replay, copied from the C2 manifest', () => {
    // If this sha256 changes, the replay was re-run: regenerate on purpose,
    // never by editing the JSON.
    expect(RECIPE_REPLAY.meta).toMatchObject({
      source: 'c2_replay',
      replayedOn: '2026-09-12',
      dataset: 'data_20260802',
      dataThrough: '2026-08-02',
      universeAssets: 30,
      engineFingerprint: 'be6cb2ec0e47',
      recipesEngineFingerprint: 'f3868e2e7526',
      csvSha256: '43fad96f232f38e95c852f3644873157726f453d76e18d3248f35b84822fae86',
    })
  })

  it('has not outlived its expiry date', () => {
    // Deliberately on the REAL clock: this test is meant to go red one day.
    // When it does, the corrected H4 gauntlet should have re-judged these
    // recipes — replace or re-date this block, do not just push the date.
    expect(Date.now()).toBeLessThan(new Date(RECIPE_REPLAY.meta.validUntil).getTime())
  })
})
