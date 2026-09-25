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

// The pending decision of 2026-09-19 was reviewed by 2026-09-22 and went past its date
// (served with the stale date until 2026-09-25, audit P0-2). User decision 2026-09-25:
// ORB is KEPT. Decisions are appended, never edited: the pending one stays in the list,
// the last one written is the one the card shows. REAL clock on purpose: the kept
// decision carries a review date, and the day after it this goes red until a new
// decision is appended -- never push the date.
describe('the last decision on ORB’s crossed rule', () => {
  const rule = 'Hors enveloppe (DD > 20 % ou PF < 1.0 après 20 trades) → bot gelé, autopsie publiée sur le blog.'
  const onRule = () => getBotExpectations('orb-bf25')!.decisions!.filter((d) => d.rule === rule)
  const last = () => onRule().at(-1)!

  it('is the kept decision of 2026-09-25, appended after the pending one', () => {
    expect(onRule().map((d) => d.status)).toEqual(['pending', 'kept'])
    expect(last().date).toBe('2026-09-25')
  })

  it('says it is kept, without a motive it does not have and without a live figure', () => {
    // Anchored at the start: the pending text of 09-19 also contains « je le garde »
    // (« si je le coupe ou si je le garde »), and a match anywhere passed on it.
    expect(last().text).toMatch(/^Le 25 septembre, je le garde\./)
    expect(last().text).not.toMatch(/\d+,\d+\s?%|PF \d/)
  })

  it('has a review date that is not past', () => {
    const today = new Date().toISOString().slice(0, 10)
    expect(last().reviewBy).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(today <= last().reviewBy!).toBe(true)
  })
})
