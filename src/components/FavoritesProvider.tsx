'use client'

// Stars on a list of bots (the fleet page, a strategy page's table), espace-
// direct lot C. The provider reads the reader's favorites ONCE for the whole
// page; each row's star reads that set. One request, not one per row (the
// fleet page lists ~120 bots). A star outside a provider renders nothing, so a
// table reused on a page without one never fires anything.

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { accessToken, callFavorite, Expired, listFavoriteSlugs, signInHref, type FavoriteKind } from '@/lib/favorites-client'

type Ctx = {
  kind: FavoriteKind
  state: 'loading' | 'guest' | 'ready'
  starred: Set<string>
  busy: Set<string>
  toggle: (slug: string) => void
}

const FavoritesContext = createContext<Ctx | null>(null)

export function FavoritesProvider({ kind, children }: { kind: FavoriteKind; children: React.ReactNode }) {
  const [state, setState] = useState<Ctx['state']>('loading')
  const [starred, setStarred] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<Set<string>>(new Set())

  useEffect(() => {
    let live = true
    ;(async () => {
      const token = await accessToken()
      if (!live) return
      if (!token) return setState('guest')
      try {
        const slugs = await listFavoriteSlugs(kind, token)
        if (!live) return
        setStarred(slugs)
        setState('ready')
      } catch (e) {
        // Unreadable: stars shown unset, a click still writes (like the fiche's).
        if (live) setState(e instanceof Expired ? 'guest' : 'ready')
      }
    })()
    return () => { live = false }
  }, [kind])

  const toggle = useCallback((slug: string) => {
    const on = !starred.has(slug)
    setBusy(prev => new Set(prev).add(slug))
    ;(async () => {
      try {
        const token = await accessToken()
        if (!token) return setState('guest')
        const now = await callFavorite(kind, slug, token, on ? 'PUT' : 'DELETE')
        setStarred(prev => {
          const next = new Set(prev)
          if (now) next.add(slug)
          else next.delete(slug)
          return next
        })
      } catch (e) {
        if (e instanceof Expired) setState('guest')
        // Any other failure: the star stays as it was.
      } finally {
        setBusy(prev => {
          const next = new Set(prev)
          next.delete(slug)
          return next
        })
      }
    })()
  }, [kind, starred])

  return (
    <FavoritesContext.Provider value={{ kind, state, starred, busy, toggle }}>
      {children}
    </FavoritesContext.Provider>
  )
}

const STAR = 'inline-flex items-center justify-center min-h-10 min-w-10 rounded-md text-base leading-none transition-colors'

export function FavoriteStar({ kind, slug, name }: { kind: FavoriteKind; slug: string; name: string }) {
  const ctx = useContext(FavoritesContext)
  if (!ctx || ctx.kind !== kind || ctx.state === 'loading') return null
  // Read here, not with usePathname: a star only renders once the provider has
  // asked the browser for the session, so `window` is always there.
  const path = window.location.pathname
  if (ctx.state === 'guest') {
    return (
      <a href={signInHref(path)} aria-label={`Garder ${name} en favori`}
         title="Connecte-toi pour garder ce bot dans ton espace"
         className={`${STAR} text-muted hover:text-foreground`}>
        <span aria-hidden="true">☆</span>
      </a>
    )
  }
  const on = ctx.starred.has(slug)
  return (
    <button type="button" onClick={() => ctx.toggle(slug)} disabled={ctx.busy.has(slug)}
            aria-pressed={on}
            aria-label={on ? `Retirer ${name} de mes favoris` : `Garder ${name} en favori`}
            className={`${STAR} ${on ? 'text-accent' : 'text-muted hover:text-foreground'} disabled:opacity-60`}>
      <span aria-hidden="true">{on ? '★' : '☆'}</span>
    </button>
  )
}
