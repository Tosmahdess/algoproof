import { describe, it, expect } from 'vitest'
import { relativeDaysFr } from '@/lib/relative-date'

const now = new Date('2026-07-04T12:00:00Z')
describe('relativeDaysFr', () => {
  it('today / yesterday / N days / old date', () => {
    expect(relativeDaysFr('2026-07-04T08:00:00Z', now)).toBe("analysé aujourd'hui")
    expect(relativeDaysFr('2026-07-03T08:00:00Z', now)).toBe('analysé hier')
    expect(relativeDaysFr('2026-06-29T08:00:00Z', now)).toBe('il y a 5 j')
    expect(relativeDaysFr('2026-05-01T08:00:00Z', now)).toMatch(/le 1 mai/)
  })
})
