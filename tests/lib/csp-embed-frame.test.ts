// The fiche of every bot offers an <iframe src="https://algoproof.fr/embed/<slug>">.
// Until 2026-10 the site sent `X-Frame-Options: DENY` on `/(.*)`, embed included,
// so every browser refused to show that iframe anywhere (audit 2026-10, n° 2).
// /embed/* may now be framed by any site; everything else keeps DENY.
//
// Each `source` is compiled with the same path-to-regexp Next.js runs the
// headers() rules through (see tests/lib/strategy-routing.test.ts), and the
// rules are folded in order: the last rule that sets a key wins, as in Next.
import { describe, it, expect } from 'vitest'
import { pathToRegexp } from 'next/dist/compiled/path-to-regexp'
import nextConfig from '../../next.config'

async function headersFor(path: string): Promise<Map<string, string>> {
  const rules = await nextConfig.headers!()
  const out = new Map<string, string>()
  for (const r of rules) {
    if (!pathToRegexp(r.source).test(path)) continue
    for (const h of r.headers) out.set(h.key, h.value)
  }
  return out
}

function directives(csp: string | undefined): Map<string, string> {
  const out = new Map<string, string>()
  for (const d of (csp ?? '').split(';').map(s => s.trim()).filter(Boolean)) {
    const [name, ...rest] = d.split(/\s+/)
    out.set(name, rest.join(' '))
  }
  return out
}

const SITE_PATHS = ['/', '/strategies/bot/v1-spot', '/api/card/v1-spot', '/faq', '/embedded', '/embed']

describe('framing headers', () => {
  it('lets any site frame /embed/<slug>: no X-Frame-Options, frame-ancestors *', async () => {
    const h = await headersFor('/embed/v1-spot')
    expect(h.has('X-Frame-Options')).toBe(false)
    expect(directives(h.get('Content-Security-Policy')).get('frame-ancestors')).toBe('*')
  })

  it('keeps DENY everywhere else', async () => {
    for (const path of SITE_PATHS) {
      const h = await headersFor(path)
      expect(h.get('X-Frame-Options'), path).toBe('DENY')
      expect(directives(h.get('Content-Security-Policy')).get('frame-ancestors'), path).toBe("'none'")
    }
  })

  it('gives the embed the rest of the site policy unchanged', async () => {
    const site = await headersFor('/')
    const embed = await headersFor('/embed/v1-spot')
    const siteCsp = directives(site.get('Content-Security-Policy'))
    const embedCsp = directives(embed.get('Content-Security-Policy'))
    siteCsp.delete('frame-ancestors')
    embedCsp.delete('frame-ancestors')
    expect(embedCsp).toEqual(siteCsp)
    for (const key of ['X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy', 'Strict-Transport-Security']) {
      expect(embed.get(key), key).toBe(site.get(key))
    }
  })
})
