// Email capture — pure helpers shared by the API route and tests.

export const VALID_SOURCES = ['home', 'blog', 'labo', 'lab-landing', 'site'] as const
export type SubscribeSource = (typeof VALID_SOURCES)[number]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Trim + lowercase + validate. Returns null when the email is not acceptable. */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const email = raw.trim().toLowerCase()
  if (!email || email.length > 254) return null
  if (!EMAIL_RE.test(email)) return null
  return email
}

/** Whitelist the source tag so the table only ever contains known values. */
export function normalizeSource(raw: unknown): SubscribeSource {
  return VALID_SOURCES.includes(raw as SubscribeSource) ? (raw as SubscribeSource) : 'site'
}
