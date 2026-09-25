// Links from algoproof.fr to the lab carry `?ref=<location>` (lot 8 of the design
// audit, 2026-09-25; C4 of the 17/09 arbitration). The two domains share no
// cookie, by design: the query string is the only thing that crosses, and the
// lab records it with the page view (page-hit.ts). A bare lab href is a visit
// the measure cannot attribute; tests/lib/lab-ref-guard.test.ts lists them.
export const LAB_ORIGIN = 'https://lab.algoproof.fr'

const REF_MAX = 64

/** A ref as it travels: lower case, [a-z0-9._-], at most 64 characters, or null. */
export function normalizeRef(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, REF_MAX)
  return s.length > 0 ? s : null
}

/** `href` with `ref=<location>` appended when it points at the lab; unchanged otherwise. */
export function labUrl(href: string, location: string): string {
  if (!href.startsWith(LAB_ORIGIN)) return href
  const ref = normalizeRef(location)
  if (!ref) return href
  const url = new URL(href)
  if (url.searchParams.has('ref')) return href
  url.searchParams.set('ref', ref)
  return url.toString()
}
