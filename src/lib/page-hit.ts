// A first-party page counter (lot 8 of the design audit, 2026-09-25; C4 of the
// 17/09 arbitration). One row per page view in the shared Supabase project
// (page_hits, migration 056): the site, the path, the `ref` that brought the
// visitor (put in the URL by algoproof's lab links, remembered for the session
// so a later page keeps the first touch) and the referrer's host. No IP, no
// user agent, no cookie: a counter, not analytics.
//
// Why first-party: Vercel Web Analytics was never enabled on either project
// (API: analytics null, Hobby plan, no custom events), so every track() call of
// both sites spoke to nothing. This module is the same file on both sides:
// algoproof src/lib/page-hit.ts and algolab web/lib/page-hit.ts are twins.
export type HitSite = 'algoproof' | 'lab'

export interface PageHit {
  site: HitSite
  path: string
  ref: string | null
  referrer_host: string | null
}

export const HIT_ENDPOINT = '/api/hit'
export const STORED_REF_KEY = 'ap_ref'

const PATH_MAX = 200
const HOST_MAX = 120
const REF_MAX = 64
const SITES: readonly HitSite[] = ['algoproof', 'lab']

/** A ref as it travels: lower case, [a-z0-9._-], at most 64 characters, or null. */
export function normalizeRef(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = raw.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, REF_MAX)
  return s.length > 0 ? s : null
}

/** Pages only: API routes, the framework's own paths and asset files are not views. */
export function shouldRecord(pathname: string): boolean {
  if (!pathname.startsWith('/')) return false
  if (pathname.startsWith('/api/') || pathname === '/api') return false
  if (pathname.startsWith('/_next/') || pathname.startsWith('/_vercel/')) return false
  if (/\.[a-z0-9]{2,5}$/i.test(pathname)) return false
  return true
}

function cleanPath(pathname: string): string | null {
  if (!shouldRecord(pathname)) return null
  return pathname.split('?')[0].split('#')[0].slice(0, PATH_MAX)
}

function cleanHost(host: string | null | undefined): string | null {
  if (!host) return null
  const h = host.trim().toLowerCase().slice(0, HOST_MAX)
  return /^[a-z0-9.-]+$/.test(h) ? h : null
}

/** The hit for the page the browser is on. `search` and `referrer` come from window. */
export function hitFromLocation(input: {
  site: HitSite
  pathname: string
  search: string
  referrer: string
  host: string
  storedRef?: string | null
}): PageHit | null {
  const path = cleanPath(input.pathname)
  if (!path) return null
  let urlRef: string | null = null
  try {
    urlRef = new URLSearchParams(input.search).get('ref')
  } catch {
    urlRef = null
  }
  const ref = normalizeRef(urlRef) ?? normalizeRef(input.storedRef)
  let referrer_host: string | null = null
  if (input.referrer) {
    try {
      const h = new URL(input.referrer).host.toLowerCase()
      referrer_host = h && h !== input.host.toLowerCase() ? cleanHost(h) : null
    } catch {
      referrer_host = null
    }
  }
  return { site: input.site, path, ref, referrer_host }
}

/** Server side: a client's body, re-sanitised. Null when it is not a hit. */
export function parseHit(body: unknown): PageHit | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const site = typeof b.site === 'string' && (SITES as readonly string[]).includes(b.site) ? (b.site as HitSite) : null
  if (!site) return null
  const path = typeof b.path === 'string' ? cleanPath(b.path) : null
  if (!path) return null
  return {
    site,
    path,
    ref: normalizeRef(typeof b.ref === 'string' ? b.ref : null),
    referrer_host: cleanHost(typeof b.referrer_host === 'string' ? b.referrer_host : null),
  }
}

const BOT_UA = /bot|crawl|spider|slurp|headless|python-requests|curl\/|wget|httpclient|vercel-screenshot|lighthouse|pingdom|preview/i

/** Crawlers and headless browsers are answered and not counted. No UA at all: not a browser. */
export function isBotUA(ua: string | null | undefined): boolean {
  if (!ua) return true
  return BOT_UA.test(ua)
}
