'use client'

// The bell on a bot page (espace-direct lot H, D075), next to the star. The
// page stays static (ISR); this island alone asks who is reading. It shows
// only on a bot with a qualified producer, and only to a Direct account while
// the sale is closed (DIRECT_SALE_OPEN). How much I send (everything, entries
// and exits, or a daily summary) is set in Mon espace on the lab.

import { useEffect, useState } from 'react'
import { LAB_ORIGIN, labUrl } from '@/lib/lab-links'
import { linkClass } from '@/lib/link-roles'
import { BellIcon, stateFor } from '@/components/FollowsProvider'
import { accessToken, boardFollows, Conflict, Expired, NotDirect, putFollow, type Follow } from '@/lib/follows-client'

type State = 'loading' | 'hidden' | 'ready' | 'offer' | 'down'

const BUTTON = 'inline-flex items-center gap-1.5 min-h-10 px-3 rounded-md border text-sm transition-colors'

export default function FollowButton({ slug }: { slug: string }) {
  const [state, setState] = useState<State>('loading')
  const [follow, setFollow] = useState<Follow | null>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let live = true
    ;(async () => {
      const token = await accessToken()
      if (!live) return
      if (!token) return setState('hidden')
      try {
        const board = await boardFollows([slug], token)
        if (!live) return
        const item = board.items[slug]
        if (!item?.followable) return setState('hidden')
        setFollow(item.follow)
        setState(stateFor(board.direct))
      } catch {
        if (live) setState('hidden')
      }
    })()
    return () => { live = false }
  }, [slug])

  async function toggle() {
    if (busy) return
    setBusy(true)
    setFailed(false)
    try {
      // Asked on every click: an access token lives an hour.
      const token = await accessToken()
      if (!token) return setState('hidden')
      setFollow(await putFollow(slug, { enabled: !follow?.enabled, expected_revision: follow?.revision ?? 0 }, token))
    } catch (e) {
      if (e instanceof Conflict) setFollow(e.current)
      else if (e instanceof Expired || e instanceof NotDirect) setState('hidden')
      else setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  if (state === 'loading' || state === 'hidden') return null
  if (state === 'offer') {
    return (
      <a href={labUrl(`${LAB_ORIGIN}/membre`, 'cloche-fiche')}
         className={`${BUTTON} border-border text-muted hover:text-foreground`}>
        <BellIcon on={false} /> Suivre en direct
      </a>
    )
  }
  const on = !!follow?.enabled
  return (
    <span className="inline-flex flex-wrap items-center gap-3">
      <button type="button" onClick={toggle} disabled={state === 'down' || busy} aria-pressed={on}
              title={state === 'down' ? 'Cloche indisponible pour le moment' : undefined}
              className={`${BUTTON} ${on ? 'border-accent/50 text-foreground' : 'border-border text-muted hover:text-foreground'} disabled:opacity-60`}>
        <BellIcon on={on} /> {on ? 'Suivi en direct' : 'Suivre en direct'}
      </button>
      {on && (
        <a href={`${labUrl(`${LAB_ORIGIN}/espace`, 'fiche-bot-cloche')}#suivis`} className={linkClass('inline', 'text-sm')}>
          Régler
        </a>
      )}
      {failed && (
        <span role="alert" className="text-sm text-negative">
          Le suivi n&apos;a pas pu être enregistré, réessaie dans un instant.
        </span>
      )}
    </span>
  )
}
