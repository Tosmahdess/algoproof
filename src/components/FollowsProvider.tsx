'use client'

// Bells on a list of bots (the fleet page, a strategy page's table), espace-
// direct lot H. Same shape as FavoritesProvider: the provider reads the bells
// of the whole table at once (one request, bounded at 200 rows) and each row
// reads that answer. A bell shows only on a bot with a qualified producer, and
// only for a Direct account while the sale is closed (DIRECT_SALE_OPEN, lot J).
// The star is never touched from here.

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { LAB_ORIGIN, labUrl } from '@/lib/lab-links'
import { DIRECT_SALE_OPEN } from '@/lib/direct-sale'
import { accessToken, boardFollows, Conflict, Expired, NotDirect, putFollow, type BoardItem } from '@/lib/follows-client'

// hidden: guest, no Direct (sale closed), unreadable board. offer: no Direct,
// sale open. down: offer unknown (outage), bells shown disabled.
type State = 'loading' | 'hidden' | 'ready' | 'offer' | 'down'

type Ctx = {
  state: State
  items: Record<string, BoardItem>
  busy: Set<string>
  toggle: (slug: string) => void
}

const FollowsContext = createContext<Ctx | null>(null)

export function stateFor(direct: boolean | null): State {
  if (direct === true) return 'ready'
  if (direct === null) return 'down'
  return DIRECT_SALE_OPEN ? 'offer' : 'hidden'
}

export function FollowsProvider({ slugs, children }: { slugs: string[]; children: React.ReactNode }) {
  const [state, setState] = useState<State>('loading')
  const [items, setItems] = useState<Record<string, BoardItem>>({})
  const [busy, setBusy] = useState<Set<string>>(new Set())
  const key = slugs.join(',')

  useEffect(() => {
    let live = true
    ;(async () => {
      const token = await accessToken()
      if (!live) return
      if (!token) return setState('hidden')
      try {
        const board = await boardFollows(key ? key.split(',') : [], token)
        if (!live) return
        setItems(board.items)
        setState(stateFor(board.direct))
      } catch {
        // Which bots are followable is unknown: no bell at all.
        if (live) setState('hidden')
      }
    })()
    return () => { live = false }
  }, [key])

  const toggle = useCallback((slug: string) => {
    const follow = items[slug]?.follow ?? null
    const on = !!follow?.enabled
    setBusy(prev => new Set(prev).add(slug))
    const set = (f: BoardItem['follow']) =>
      setItems(prev => ({ ...prev, [slug]: { followable: prev[slug]?.followable ?? true, follow: f } }))
    ;(async () => {
      try {
        const token = await accessToken()
        if (!token) return setState('hidden')
        set(await putFollow(slug, { enabled: !on, expected_revision: follow?.revision ?? 0 }, token))
      } catch (e) {
        if (e instanceof Conflict) set(e.current)
        else if (e instanceof Expired || e instanceof NotDirect) setState('hidden')
        // Any other failure: the bell stays as it was.
      } finally {
        setBusy(prev => {
          const next = new Set(prev)
          next.delete(slug)
          return next
        })
      }
    })()
  }, [items])

  return <FollowsContext.Provider value={{ state, items, busy, toggle }}>{children}</FollowsContext.Provider>
}

const BELL = 'inline-flex items-center justify-center min-h-10 min-w-10 rounded-md leading-none transition-colors'

export function BellIcon({ on }: { on: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill={on ? 'currentColor' : 'none'}
         stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
      <path d="M10.3 20a1.9 1.9 0 0 0 3.4 0" />
    </svg>
  )
}

export function FollowBell({ slug, name }: { slug: string; name: string }) {
  const ctx = useContext(FollowsContext)
  if (!ctx || ctx.state === 'loading' || ctx.state === 'hidden') return null
  const item = ctx.items[slug]
  if (!item?.followable) return null
  if (ctx.state === 'offer') {
    return (
      <a href={labUrl(`${LAB_ORIGIN}/membre`, 'cloche-flotte')} aria-label={`Recevoir ${name} en direct : offre Direct`}
         title="Recevoir ses opérations sur Telegram, avec l'offre Direct"
         className={`${BELL} text-muted hover:text-foreground`}>
        <BellIcon on={false} />
      </a>
    )
  }
  const on = !!item.follow?.enabled
  return (
    <button type="button" onClick={() => ctx.toggle(slug)}
            disabled={ctx.state === 'down' || ctx.busy.has(slug)}
            aria-pressed={on}
            aria-label={on ? `Ne plus recevoir ${name}` : `Recevoir ${name} en direct`}
            title={ctx.state === 'down' ? 'Cloche indisponible pour le moment' : undefined}
            className={`${BELL} ${on ? 'text-accent' : 'text-muted hover:text-foreground'} disabled:opacity-50`}>
      <BellIcon on={on} />
    </button>
  )
}
