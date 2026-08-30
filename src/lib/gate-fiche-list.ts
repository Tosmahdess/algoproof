import type { Entitlement } from '@/lib/entitlement'

type Gatable = {
  ticker: string
  verdict: string | null
  verdict_reason?: string | null
}

/** Blanks the verdict on every company outside the free five, unless the
 *  visitor is a member. Name, sector and freshness stay visible to everyone
 *  (spec 2.1): the directory shows what is covered, the membership shows what
 *  I think of it. Returns new objects; never mutates. */
export function gateFicheList<T extends Gatable>(
  rows: T[],
  entitlement: Entitlement,
  freeTickers: string[],
): T[] {
  if (entitlement === 'paid') return rows
  const free = new Set(freeTickers)
  return rows.map((r) =>
    free.has(r.ticker)
      ? r
      : { ...r, verdict: null, ...(('verdict_reason' in r) ? { verdict_reason: null } : {}) },
  )
}
