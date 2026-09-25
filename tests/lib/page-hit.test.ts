import { describe, it, expect } from 'vitest'
import { hitFromLocation, parseHit, shouldRecord, isBotUA, HIT_ENDPOINT } from '@/lib/page-hit'

// Lot 8 of the design audit (2026-09-25): a first-party page counter. Vercel Web
// Analytics was never enabled on either project (API: analytics null, Hobby plan,
// no custom events), so every track() call of the site spoke to nothing and the
// audit's « aucune mesure de fréquentation n'existe » was literally true. One row
// per page view: site, path, the `ref` that brought the visitor, the referrer's
// host. No IP, no user agent, no cookie.
describe('hitFromLocation', () => {
  it('records the path, the ref of the URL and an external referrer host', () => {
    expect(hitFromLocation({
      site: 'algoproof', pathname: '/overview', search: '?ref=home-hero&x=1',
      referrer: 'https://www.google.com/search?q=x', host: 'algoproof.fr',
    })).toEqual({ site: 'algoproof', path: '/overview', ref: 'home-hero', referrer_host: 'www.google.com' })
  })

  it('drops an internal referrer and a missing ref', () => {
    expect(hitFromLocation({
      site: 'algoproof', pathname: '/blog', search: '', referrer: 'https://algoproof.fr/', host: 'algoproof.fr',
    })).toEqual({ site: 'algoproof', path: '/blog', ref: null, referrer_host: null })
  })

  it('falls back to the ref remembered for the session, so the lab keeps the first touch on later pages', () => {
    expect(hitFromLocation({
      site: 'lab', pathname: '/cockpit', search: '', referrer: '', host: 'lab.algoproof.fr', storedRef: 'strategies',
    })?.ref).toBe('strategies')
  })

  it('normalises the ref and refuses garbage', () => {
    expect(hitFromLocation({ site: 'lab', pathname: '/lab', search: '?ref=Home%20Hero', referrer: '', host: 'l' })?.ref).toBe('home-hero')
    expect(hitFromLocation({ site: 'lab', pathname: '/lab', search: '?ref=<script>', referrer: '', host: 'l' })?.ref).toBe('script')
    expect(hitFromLocation({ site: 'lab', pathname: '/lab', search: '?ref=%3C%3E', referrer: '', host: 'l' })?.ref).toBeNull()
  })

  it('keeps the path only, cut at 200 characters, and returns null for what is not a page', () => {
    const long = '/' + 'a'.repeat(300)
    expect(hitFromLocation({ site: 'algoproof', pathname: long, search: '', referrer: '', host: 'h' })?.path).toHaveLength(200)
    expect(hitFromLocation({ site: 'algoproof', pathname: '/api/hit', search: '', referrer: '', host: 'h' })).toBeNull()
  })
})

describe('shouldRecord', () => {
  it('skips API, framework and asset paths, records the pages', () => {
    expect(shouldRecord('/api/mi')).toBe(false)
    expect(shouldRecord('/_next/static/x.js')).toBe(false)
    expect(shouldRecord('/favicon.ico')).toBe(false)
    expect(shouldRecord('/')).toBe(true)
    expect(shouldRecord('/strategies/bot/orb-bf25')).toBe(true)
  })
})

describe('parseHit (server side)', () => {
  it('accepts a well-formed body and re-sanitises it', () => {
    expect(parseHit({ site: 'lab', path: '/lab', ref: 'Home-Hero', referrer_host: 'algoproof.fr' }))
      .toEqual({ site: 'lab', path: '/lab', ref: 'home-hero', referrer_host: 'algoproof.fr' })
  })

  it('refuses an unknown site, a path that is not a path, or a non-object', () => {
    expect(parseHit({ site: 'other', path: '/x' })).toBeNull()
    expect(parseHit({ site: 'lab', path: 'lab' })).toBeNull()
    expect(parseHit({ site: 'lab', path: '/api/hit' })).toBeNull()
    expect(parseHit('nope')).toBeNull()
    expect(parseHit(null)).toBeNull()
  })

  it('caps the referrer host and drops one that is not a host', () => {
    expect(parseHit({ site: 'lab', path: '/', referrer_host: 'x'.repeat(300) })!.referrer_host).toHaveLength(120)
    expect(parseHit({ site: 'lab', path: '/', referrer_host: 'not a host' })!.referrer_host).toBeNull()
  })
})

describe('isBotUA', () => {
  it('names the usual crawlers and headless browsers, and nothing else', () => {
    for (const ua of ['Mozilla/5.0 (compatible; Googlebot/2.1)', 'bingbot/2.0', 'HeadlessChrome/120', 'python-requests/2.31', 'curl/8.0', 'vercel-screenshot']) {
      expect(isBotUA(ua), ua).toBe(true)
    }
    expect(isBotUA('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1')).toBe(false)
    expect(isBotUA(null)).toBe(true)
  })
})

describe('HIT_ENDPOINT', () => {
  it('is the same-origin route both sites post to', () => {
    expect(HIT_ENDPOINT).toBe('/api/hit')
  })
})
