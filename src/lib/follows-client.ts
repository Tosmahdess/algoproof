// Talking to the lab's follow API from this site (espace-direct lot H, the bell
// of Direct). Same transport as the favorites: browser only, the session's
// access token as a bearer, never a cookie (`credentials: 'omit'`), and the
// API's origin is already in the CSP's connect-src (tests/lib/csp-lab-api.test.ts).
import { LAB_API_ORIGIN } from '@/lib/lab-links'
import { Expired } from '@/lib/favorites-client'

export { accessToken, Expired } from '@/lib/favorites-client'

export type Noise = 'all' | 'entries_exits' | 'daily'
export type Follow = { enabled: boolean; noise: Noise; revision: number }
export type BoardItem = { followable: boolean; follow: Follow | null }
/** direct: null = the offer could not be read (outage), never « no Direct ». */
export type Board = { direct: boolean | null; items: Record<string, BoardItem> }

/** 409: the bell changed elsewhere; `current` is the row the server holds. */
export class Conflict extends Error {
  constructor(public current: Follow | null) { super('conflict') }
}
/** 402: switching a bell on needs Direct. */
export class NotDirect extends Error {}

const BOARD_MAX = 200 // the API's bound per request

async function call(path: string, token: string, init: { method: string; body?: unknown }) {
  const res = await fetch(`${LAB_API_ORIGIN}${path}`, {
    method: init.method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    credentials: 'omit',
    cache: 'no-store',
  })
  if (res.status === 401) throw new Expired()
  if (res.status === 402) throw new NotDirect()
  if (res.status === 409) {
    const body = await res.json().catch(() => ({}))
    throw new Conflict(body?.detail?.current ?? null)
  }
  if (!res.ok) throw new Error(`follows ${res.status}`)
  return res.json()
}

/** The bells of a whole table, in as few requests as the API's bound allows. */
export async function boardFollows(slugs: string[], token: string): Promise<Board> {
  const out: Board = { direct: null, items: {} }
  let first = true
  for (let i = 0; i < slugs.length; i += BOARD_MAX) {
    const page = await call('/me/follows/board', token, { method: 'POST', body: { slugs: slugs.slice(i, i + BOARD_MAX) } })
    if (first) out.direct = page.direct_access ?? null
    first = false
    Object.assign(out.items, page.items)
  }
  return out
}

export async function putFollow(
  slug: string,
  body: { enabled?: boolean; noise?: Noise; expected_revision: number },
  token: string,
): Promise<Follow> {
  return (await call(`/me/follows/bot/${encodeURIComponent(slug)}`, token, { method: 'PUT', body })).follow
}
