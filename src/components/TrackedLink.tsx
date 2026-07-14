'use client'

import type { ReactNode } from 'react'
import { trackCtaLab, trackOutboundExchange, type Exchange } from '@/lib/analytics'

type Common = {
  href: string
  className?: string
  target?: string
  rel?: string
  'aria-label'?: string
  children: ReactNode
}

// Serializable props only: this component can be rendered from a Server Component
// (functions can't cross the RSC boundary). The event taxonomy is resolved internally
// against @/lib/analytics.
type Props = Common &
  (
    | { event: 'cta_lab'; location: string }
    | { event: 'outbound_exchange'; exchange: Exchange; location: string }
  )

export default function TrackedLink(props: Props) {
  const { href, className, target, rel, children } = props
  const ariaLabel = props['aria-label']

  const fire = () => {
    if (props.event === 'outbound_exchange') {
      trackOutboundExchange(props.exchange, props.location)
    } else {
      trackCtaLab(props.location)
    }
  }

  return (
    <a href={href} className={className} target={target} rel={rel} aria-label={ariaLabel} onClick={fire}>
      {children}
    </a>
  )
}
