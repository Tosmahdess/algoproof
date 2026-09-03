import { describe, it, expect } from 'vitest'
import { shortDate, shortDatePadded, longDate, numericDate, formatDate, SITE_TIME_ZONE } from '@/lib/format-date'

/**
 * Every call site passed 'fr-FR' and none passed a timeZone. Vercel renders in
 * UTC and the visitor's browser in their own zone, so a trade closed at 23:30
 * UTC read "3 sept." on the server and "4 sept." in Paris. React saw two trees,
 * threw hydration error #418, and discarded the server HTML for the subtree —
 * which is how the charts inside ended up remounting into an unlaid-out
 * container and measuring 0x0.
 */
describe('format-date', () => {
  const lateEvening = '2026-09-03T23:30:00Z' // 4 Sept in Paris, 3 Sept in UTC

  it('pins the zone the whole site is written for', () => {
    expect(SITE_TIME_ZONE).toBe('Europe/Paris')
  })

  it('gives the Paris day for a timestamp that falls on either side of midnight', () => {
    expect(shortDate(lateEvening)).toMatch(/4 sept/)
    expect(shortDatePadded(lateEvening)).toMatch(/04 sept/)
    expect(numericDate(lateEvening)).toBe('04/09/2026')
    expect(longDate(lateEvening)).toBe('4 septembre 2026')
  })

  it('does not drift with the machine timezone — the whole point', () => {
    // Whatever TZ the process runs in, the rendered day is the Paris day.
    const before = shortDate(lateEvening)
    const previousTz = process.env.TZ
    process.env.TZ = 'America/Los_Angeles'
    expect(shortDate(lateEvening)).toBe(before)
    process.env.TZ = previousTz
  })

  it('keeps the early hours of a day on that day', () => {
    expect(numericDate('2026-09-04T00:30:00Z')).toBe('04/09/2026')
  })

  it('formatDate carries the zone through arbitrary options', () => {
    expect(formatDate(lateEvening, { day: '2-digit', month: '2-digit' })).toBe('04/09')
  })

  it('accepts a Date and a number as well as a string', () => {
    expect(numericDate(new Date(lateEvening))).toBe('04/09/2026')
    expect(numericDate(Date.parse(lateEvening))).toBe('04/09/2026')
  })
})
