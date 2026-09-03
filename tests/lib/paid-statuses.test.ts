import { describe, it, expect } from 'vitest'
import { PAID_STATUSES } from '@/lib/entitlement'

/**
 * One question, one answer. "Does this account currently pay?" used to have
 * three: the lab API said active/trialing/past_due, this site said
 * active/trialing, and the dossier SQL said active only. A member whose renewal
 * was failing kept the lab, lost the dossiers, and read "free" here.
 */
describe('PAID_STATUSES', () => {
  it('counts a failing renewal as paying — access continues while Stripe retries', () => {
    expect(PAID_STATUSES).toContain('past_due')
  })

  it('counts the ordinary paying states', () => {
    expect(PAID_STATUSES).toContain('active')
    expect(PAID_STATUSES).toContain('trialing')
  })

  it('does NOT count the states where Stripe has given up', () => {
    expect(PAID_STATUSES).not.toContain('unpaid')
    expect(PAID_STATUSES).not.toContain('canceled')
    expect(PAID_STATUSES).not.toContain('incomplete')
  })

  it('is exactly three states, so a fourth is a deliberate decision', () => {
    expect([...PAID_STATUSES].sort()).toEqual(['active', 'past_due', 'trialing'])
  })
})
