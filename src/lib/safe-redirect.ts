const PLACEHOLDER_ORIGIN = 'http://safe-next.invalid'

/** Blocks open redirects: only a same-origin relative path is an acceptable
 *  post-sign-in target. An absolute ("https://..."), protocol-relative
 *  ("//host"), or backslash-normalized ("/\evil.example", which the WHATWG
 *  URL parser rewrites to "//evil.example" for http/https) value would bounce
 *  a freshly authenticated visitor to somebody else's page, carrying the
 *  referrer with them. A prefix check loses to that normalization, so this
 *  validates by parsing with the placeholder origin and checking the origin
 *  survived unchanged — the only thing that agrees with what the browser
 *  will actually resolve. The parsed pathname/search/hash is returned
 *  (rather than `raw`) so nothing downstream re-interprets the string
 *  differently than the parser already has. */
export function safeNext(raw: string | null | undefined, fallback = '/compte'): string {
  if (!raw) return fallback
  try {
    const url = new URL(raw, PLACEHOLDER_ORIGIN)
    if (url.origin !== PLACEHOLDER_ORIGIN) return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}
