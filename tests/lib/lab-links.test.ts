import { describe, it, expect } from 'vitest'
import { labUrl, normalizeRef, LAB_ORIGIN } from '@/lib/lab-links'

// Lot 8 of the design audit (2026-09-25, C4 of the 17/09 arbitration): every link
// from algoproof.fr to the lab carries `?ref=<location>`, so the lab can tell
// which page of this site sent a visitor. The two domains share no cookie, by
// design; the query string is the only thing that crosses.
describe('labUrl', () => {
  it('appends ref=<location> to a lab URL', () => {
    expect(labUrl(`${LAB_ORIGIN}/lab`, 'home-hero')).toBe(`${LAB_ORIGIN}/lab?ref=home-hero`)
    expect(labUrl(LAB_ORIGIN, 'footer')).toBe(`${LAB_ORIGIN}/?ref=footer`)
  })

  it('keeps an existing query and a hash', () => {
    expect(labUrl(`${LAB_ORIGIN}/lab?preset=ema`, 'concept-ema-cross')).toBe(`${LAB_ORIGIN}/lab?preset=ema&ref=concept-ema-cross`)
    expect(labUrl(`${LAB_ORIGIN}/cockpit/survivants#top`, 'strategies')).toBe(`${LAB_ORIGIN}/cockpit/survivants?ref=strategies#top`)
  })

  it('normalises the location: lower case, [a-z0-9._-], at most 64 characters', () => {
    expect(labUrl(`${LAB_ORIGIN}/lab`, 'Home Hero (A)')).toBe(`${LAB_ORIGIN}/lab?ref=home-hero-a`)
    expect(normalizeRef('x'.repeat(80))).toHaveLength(64)
    expect(normalizeRef('   ')).toBeNull()
  })

  it('leaves a non-lab URL untouched', () => {
    expect(labUrl('/overview', 'nav')).toBe('/overview')
    expect(labUrl('https://algoproof.fr/blog', 'nav')).toBe('https://algoproof.fr/blog')
  })

  it('does not stack a second ref on a URL that already carries one', () => {
    expect(labUrl(`${LAB_ORIGIN}/lab?ref=already`, 'nav')).toBe(`${LAB_ORIGIN}/lab?ref=already`)
  })
})
