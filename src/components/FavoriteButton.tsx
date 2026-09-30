'use client'

// The favorite star on a bot page (chantier espace-direct, lot A, D075).
//
// The bot page is static (ISR, 30 min): this island is the only part that
// knows who is reading. It takes the session from the identity project in the
// browser and asks the lab API, which owns the favorites
// (api-lab.algoproof.fr/me/favorites, lab repo api/routes_workspace.py), with
// the access token as a bearer. No cookie crosses: `credentials: 'omit'`.
//
// A guest never reaches the API: the star is a link to /compte, which sends
// them back here after the magic link. Nothing is starred on their behalf on
// the way back: they click again. A write that fails leaves the star as it was.

import { useEffect, useState } from 'react'
import { createSupabaseAuthBrowser } from '@/lib/supabase-auth-browser'
import { LAB_API_ORIGIN, LAB_ORIGIN, labUrl } from '@/lib/lab-links'
import { linkClass } from '@/lib/link-roles'

type State = 'loading' | 'guest' | 'off' | 'on'

class Expired extends Error {}

async function call(slug: string, token: string, method: 'GET' | 'PUT' | 'DELETE'): Promise<boolean> {
  const res = await fetch(`${LAB_API_ORIGIN}/me/favorites/bot/${encodeURIComponent(slug)}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'omit',
    cache: 'no-store',
  })
  if (res.status === 401) throw new Expired()
  if (!res.ok) throw new Error(`favorites ${res.status}`)
  return (await res.json()).favorite === true
}

async function accessToken(): Promise<string | null> {
  try {
    const { data } = await createSupabaseAuthBrowser().auth.getSession()
    return data.session?.access_token ?? null
  } catch {
    return null
  }
}

const BUTTON = 'inline-flex items-center gap-1.5 min-h-10 px-3 rounded-md border text-sm transition-colors'

export default function FavoriteButton({ slug }: { slug: string }) {
  const [state, setState] = useState<State>('loading')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    ;(async () => {
      const t = await accessToken()
      if (!live) return
      if (!t) return setState('guest')
      setToken(t)
      try {
        const on = await call(slug, t, 'GET')
        if (live) setState(on ? 'on' : 'off')
      } catch (e) {
        // Unreadable state: show the star unset, a click still writes.
        if (live) setState(e instanceof Expired ? 'guest' : 'off')
      }
    })()
    return () => { live = false }
  }, [slug])

  async function toggle() {
    if (!token || busy) return
    const was = state
    setBusy(true)
    setFailed(false)
    try {
      const on = await call(slug, token, was === 'on' ? 'DELETE' : 'PUT')
      setState(on ? 'on' : 'off')
    } catch (e) {
      if (e instanceof Expired) setState('guest')
      else setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  if (state === 'guest') {
    return (
      <a
        href={`/compte?next=${encodeURIComponent(`/strategies/bot/${slug}`)}`}
        title="Connecte-toi pour garder ce bot et le retrouver dans ton espace"
        className={`${BUTTON} border-border text-muted hover:text-foreground`}
      >
        <span aria-hidden="true">☆</span> Garder en favori
      </a>
    )
  }

  const on = state === 'on'
  return (
    <span className="inline-flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        disabled={state === 'loading' || busy}
        aria-pressed={on}
        className={`${BUTTON} ${on ? 'border-accent/50 text-foreground' : 'border-border text-muted hover:text-foreground'} disabled:opacity-60`}
      >
        <span aria-hidden="true">{on ? '★' : '☆'}</span> {on ? 'Dans mes favoris' : 'Garder en favori'}
      </button>
      {on && (
        <a href={labUrl(`${LAB_ORIGIN}/espace`, 'fiche-bot-favori')} className={linkClass('inline', 'text-sm')}>
          Mon espace
        </a>
      )}
      {failed && (
        <span role="alert" className="text-sm text-negative">
          Le favori n&apos;a pas pu être enregistré, réessaie dans un instant.
        </span>
      )}
    </span>
  )
}
