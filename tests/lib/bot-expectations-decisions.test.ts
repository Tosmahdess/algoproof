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

// A pending decision without a date is a warning nobody removes. ORB's is re-examined on
// 2026-09-22 (user, 2026-09-19). REAL clock on purpose: the day after, this goes red until
// the decision is updated -- append the new one (frozen or kept), never push the date.
describe('a pending decision has a review date that is not past', () => {
  it('ORB pending decision is reviewed by 2026-09-22 and the date is not past', () => {
    const orb = getBotExpectations('orb-bf25')!
    const pending = orb.decisions!.filter((d) => d.status === 'pending').at(-1)!
    expect(pending.reviewBy).toBe('2026-09-22')
    const today = new Date().toISOString().slice(0, 10)
    expect(today <= pending.reviewBy!).toBe(true)
  })
})
