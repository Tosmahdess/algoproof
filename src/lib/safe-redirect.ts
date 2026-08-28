/** Blocks open redirects: only a same-origin relative path is an acceptable
 *  post-sign-in target. An absolute ("https://...") or protocol-relative
 *  ("//host") value would bounce a freshly authenticated visitor to somebody
 *  else's page, carrying the referrer with them. */
export function safeNext(raw: string | null | undefined, fallback = '/compte'): string {
  if (!raw) return fallback
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : fallback
}
