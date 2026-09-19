import { describe, expect, it } from 'vitest'
import { getBotExpectations } from '@/lib/bot-expectations'

// A decision joins its rule by the rule's exact text. Reword a kill criterion without
// its decision and the decision would silently stop printing: this pins the join.
describe('published decisions', () => {
  it('ORB carries a dated decision on its out-of-envelope rule', () => {
    const orb = getBotExpectations('orb-bf25')!
    const rule = orb.killCriteria.find((r) => r.startsWith('Hors enveloppe'))!
    const decision = orb.decisions?.find((d) => d.rule === rule)
    expect(decision).toBeDefined()
    expect(decision!.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    // No figure copied from the live stats: the table above recomputes them and a
    // frozen copy would drift from it without a sound.
    expect(decision!.text).not.toMatch(/\d+,\d+\s?%|PF \d/)
  })
})
