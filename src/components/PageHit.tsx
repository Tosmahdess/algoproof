'use client'
// One hit per page (lot 8 of the design audit, 2026-09-25). Mounted once in the
// root layout. The URL is read inside the effect, never through useSearchParams:
// that hook's CSR bailout once stripped the whole register out of /overview's
// served HTML. sendBeacon so a navigation cannot cancel the post; the ref of
// the URL is remembered for the session so a later page keeps the first touch.
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { hitFromLocation, HIT_ENDPOINT, STORED_REF_KEY, type HitSite } from '@/lib/page-hit'

function readStoredRef(): string | null {
  try { return window.sessionStorage.getItem(STORED_REF_KEY) } catch { return null }
}

function storeRef(ref: string): void {
  try { window.sessionStorage.setItem(STORED_REF_KEY, ref) } catch { /* private mode: no first touch kept */ }
}

export default function PageHit({ site }: { site: HitSite }) {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return
    const urlRef = new URLSearchParams(window.location.search).get('ref')
    const hit = hitFromLocation({
      site,
      pathname,
      search: window.location.search,
      referrer: document.referrer,
      host: window.location.host,
      storedRef: urlRef ? null : readStoredRef(),
    })
    if (!hit) return
    if (hit.ref && urlRef) storeRef(hit.ref)
    const body = JSON.stringify(hit)
    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(HIT_ENDPOINT, new Blob([body], { type: 'application/json' }))
    } else {
      fetch(HIT_ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {})
    }
  }, [pathname, site])

  return null
}
