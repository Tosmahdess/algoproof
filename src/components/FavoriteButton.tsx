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
import { LAB_ORIGIN, labUrl } from '@/lib/lab-links'
import { linkClass } from '@/lib/link-roles'
import { StarIcon } from '@/components/icons'
import { accessToken, callFavorite, Expired, pagePath, signInHref, type FavoriteKind } from '@/lib/favorites-client'

type State = 'loading' | 'guest' | 'off' | 'on'

const BUTTON = 'inline-flex items-center gap-1.5 min-h-11 px-3 rounded-md border text-sm transition-colors'

// Refonte lot 3 (2026-10-02): the bot fiche asks for the maquette's button,
// `appearance="registre"`: 44 px, a control contour (not the decorative rule), ink text.
// Same states, same requests; every other caller keeps the default. Both draw the star
// (src/components/icons.tsx); the default one wore the glyphs ☆ ★ until 2026-10-03.
const REGISTRE = 'inline-flex items-center gap-2 min-h-11 px-4 rounded border text-sm font-semibold transition-colors'

export default function FavoriteButton({ slug, kind = 'bot', appearance = 'default' }: {
  slug: string
  kind?: FavoriteKind
  appearance?: 'default' | 'registre'
}) {
  const registre = appearance === 'registre'
  const [state, setState] = useState<State>('loading')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let live = true
    ;(async () => {
      const t = await accessToken()
      if (!live) return
      if (!t) return setState('guest')
      try {
        const on = await callFavorite(kind, slug, t, 'GET')
        if (live) setState(on ? 'on' : 'off')
      } catch (e) {
        // Unreadable state: show the star unset, a click still writes.
        if (live) setState(e instanceof Expired ? 'guest' : 'off')
      }
    })()
    return () => { live = false }
  }, [slug, kind])

  async function toggle() {
    if (busy) return
    const was = state
    setBusy(true)
    setFailed(false)
    try {
      // Asked again on every click, never kept from mount: an access token
      // lives an hour and getSession() refreshes it only when it is called.
      const token = await accessToken()
      if (!token) return setState('guest')
      const on = await callFavorite(kind, slug, token, was === 'on' ? 'DELETE' : 'PUT')
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
        href={signInHref(pagePath(kind, slug))}
        title="Connecte-toi pour le garder et le retrouver dans ton espace"
        className={registre
          ? `${REGISTRE} border-border-strong text-foreground hover:bg-card-2`
          : `${BUTTON} border-border text-muted hover:text-foreground`}
      >
        <StarIcon on={false} className={registre ? undefined : 'h-4 w-4'} />{' '}Garder en favori
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
        className={registre
          ? `${REGISTRE} ${on ? 'border-accent bg-card-2 text-foreground' : 'border-border-strong text-foreground hover:bg-card-2'} disabled:opacity-60`
          : `${BUTTON} ${on ? 'border-accent/50 text-foreground' : 'border-border text-muted hover:text-foreground'} disabled:opacity-60`}
      >
        <StarIcon on={on} className={registre ? undefined : 'h-4 w-4'} />{' '}{on ? 'Dans mes favoris' : 'Garder en favori'}
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
