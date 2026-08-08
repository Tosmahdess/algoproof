import { describe, it, expect } from 'vitest'
import {
  GAUNTLET_EXPLAINER_TITLE,
  GAUNTLET_FUNNEL,
  GAUNTLET_TRIALS,
  GAUNTLET_VERDICTS,
  GAUNTLET_HONESTY,
} from '@/lib/gauntlet-explainer'

const ALL = [
  GAUNTLET_EXPLAINER_TITLE,
  ...GAUNTLET_FUNNEL,
  ...GAUNTLET_TRIALS.flatMap(t => [t.name, t.plain]),
  ...GAUNTLET_VERDICTS,
  ...GAUNTLET_HONESTY,
].join('\n')

describe('gauntlet explainer copy', () => {
  it('carries the four trials, no more and no fewer', () => {
    // The lab calls them « les quatre épreuves » in engine-vocab.ts's CAUSE_FR and in
    // RecipeGroup's « elle a tenu les quatre épreuves ». A fifth cause added engine-side
    // without updating this copy would make both sites lie in different directions.
    expect(GAUNTLET_TRIALS).toHaveLength(4)
    for (const t of GAUNTLET_TRIALS) {
      expect(t.name.length, t.name).toBeGreaterThan(0)
      expect(t.plain.length, t.name).toBeGreaterThan(0)
    }
  })

  it('leaks no engine identifier into public prose', () => {
    // R2 of the redaction rules: machine tokens never reach published copy. These are the
    // ones this particular text is at risk of importing, since it describes their mechanics.
    const FORBIDDEN = [
      'pf_12m', 'GO_PAPER', 'MARGINAL', 'NO_GO', 'stage2', 'finalize', 'top_k', 'top-k',
      'cheap_gate', 'cheap-gate', 'wf_oos', 'null_pct', 'loo_unstable', 'assets_go',
      'engine_unit_key', 'judging_cap', 'n_behaviors', 'kmax',
    ]
    for (const token of FORBIDDEN) {
      expect(ALL.toLowerCase().includes(token.toLowerCase()), `leaks ${token}`).toBe(false)
    }
  })

  it('uses no em or en dash', () => {
    // Banned site-wide, and strategy-library.ts's header restates it for fiche content.
    expect(ALL.includes('—'), 'em dash').toBe(false)
    expect(ALL.includes('–'), 'en dash').toBe(false)
  })

  it('speaks the lab’s established French, so the two sites do not diverge', () => {
    // lib/engine-vocab.ts on lab.algoproof.fr is the single place an engine token becomes
    // French. If this copy invented its own words for the same objects, a reader crossing
    // from a concept page to the cockpit would think they were different machines.
    for (const word of ['tamis', 'gantelet', 'quatre épreuves', 'en sursis', 'candidate']) {
      expect(ALL.toLowerCase().includes(word), `missing established term: ${word}`).toBe(true)
    }
  })

  it('says the unjudged configurations are not rejected', () => {
    // D-APX-GATE-4: the 20 000 cap is an economy, disclosed, not a verdict. Losing this
    // distinction would turn a compute budget into a claim about the strategies.
    expect(ALL).toMatch(/non jugées/)
    expect(ALL).toMatch(/20 000/)
  })

  it('keeps the paid product out of the free explanation', () => {
    // /preuve promises the exact configuration and its full dossier become paid. The process
    // is the free part. A concrete threshold or a filter combination here would contradict
    // that page and give away the thing being sold.
    expect(ALL).not.toMatch(/\b\d+[.,]\d+\s*<\s*\d/)      // a "0,77<1,15" style threshold
    expect(ALL).not.toMatch(/ema_fast|ema_slow|atr_mult|adx_min|rsi_gate/)
  })

  it('never claims the candidates are winners', () => {
    expect(ALL).toMatch(/n’est pas une gagnante/)
  })
})
