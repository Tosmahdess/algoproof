'use client'

import { useEffect } from 'react'
import { trackViewBot } from '@/lib/analytics'

/**
 * Fires a `view_bot` analytics event on mount. Rendered by the (server) bot detail page
 * so the event fires client-side without turning the whole page into a client component.
 */
export default function TrackView({ slug }: { slug: string }) {
  useEffect(() => {
    trackViewBot(slug)
  }, [slug])
  return null
}
