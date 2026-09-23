'use client'

import { useLinkStatus } from 'next/link'

/**
 * The spinner a nav link shows while its destination is still loading.
 *
 * Must be rendered INSIDE a <Link> — that is how `useLinkStatus` finds the
 * navigation it reports on.
 *
 * Two rules, both from Next's own guidance and both load-bearing here:
 *
 * The element is ALWAYS rendered and only its opacity changes. Mounting it on
 * click would widen the link at the exact moment the visitor is reading its
 * label, so the fix for "nothing happens when I click" would be a jump under
 * the cursor. It reserves its 12 px from the first paint.
 *
 * `role="status"` appears only while pending. An always-present live region
 * with an empty name is announced by some screen readers on every render; the
 * wait is worth announcing, the idle state is not.
 *
 * Note this is a no-op wherever prefetching already covers the route: Next
 * skips the pending state for a prefetched destination. It earns its place on
 * the links prefetch does not reach — below the fold, on a slow connection, or
 * to a dynamic route whose shell is not cached yet.
 */
export default function LinkPending() {
  const { pending } = useLinkStatus()

  return (
    <span
      data-testid="link-pending"
      className={`inline-block h-3 w-3 flex-shrink-0 rounded-full border border-current border-t-transparent transition-opacity ${
        pending ? 'animate-spin opacity-70' : 'opacity-0'
      }`}
      {...(pending
        ? { role: 'status' as const, 'aria-label': 'Chargement de la page' }
        : { 'aria-hidden': true })}
    />
  )
}
