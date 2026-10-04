// Talking to the lab's favorites API from this site (espace-direct lots A and C).
// Browser only: the session is read from the identity project in the browser
// and travels as a bearer, never as a cookie (`credentials: 'omit'`). The API's
// origin is in the CSP's connect-src through the same constant
// (tests/lib/csp-lab-api.test.ts).
import { createSupabaseAuthBrowser } from '@/lib/supabase-auth-browser'
import { LAB_API_ORIGIN } from '@/lib/lab-links'

export type FavoriteKind = 'bot' | 'strategy' | 'company' | 'idea'

/** 401: the session is gone, the reader must sign in again. */
export class Expired extends Error {}

/** The session's access token, asked every time: getSession() refreshes an
 *  expired one only when it is called. */
export async function accessToken(): Promise<string | null> {
  try {
    const { data } = await createSupabaseAuthBrowser().auth.getSession()
    return data.session?.access_token ?? null
  } catch {
    return null
  }
}

async function send(path: string, token: string, method: 'GET' | 'PUT' | 'DELETE') {
  const res = await fetch(`${LAB_API_ORIGIN}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'omit',
    cache: 'no-store',
  })
  if (res.status === 401) throw new Expired()
  if (!res.ok) throw new Error(`favorites ${res.status}`)
  return res.json()
}

/** GET (read), PUT (star) or DELETE (unstar) one page; resolves to the state the server holds. */
export async function callFavorite(kind: FavoriteKind, slug: string, token: string,
                                   method: 'GET' | 'PUT' | 'DELETE'): Promise<boolean> {
  return (await send(`/me/favorites/${kind}/${encodeURIComponent(slug)}`, token, method)).favorite === true
}

/** Every starred slug of one kind, in as many pages as it takes (50 a page). */
export async function listFavoriteSlugs(kind: FavoriteKind, token: string): Promise<Set<string>> {
  const out = new Set<string>()
  let cursor: string | null = null
  for (let i = 0; i < 40; i++) {
    const q = new URLSearchParams({ kind, limit: '50', ...(cursor ? { cursor } : {}) })
    const page = await send(`/me/favorites?${q}`, token, 'GET')
    for (const it of page.items) out.add(it.slug)
    cursor = page.next_cursor
    if (!cursor) break
  }
  return out
}

/** Where a page lives on this site: the magic link brings a guest back there. */
export function pagePath(kind: FavoriteKind, slug: string): string {
  if (kind === 'bot') return `/strategies/bot/${slug}`
  if (kind === 'strategy') return `/strategies/${slug}`
  if (kind === 'idea') return `/bibliotheque/${slug}`
  return `/investir/${slug}`
}

export function signInHref(path: string): string {
  return `/compte?next=${encodeURIComponent(path)}`
}
