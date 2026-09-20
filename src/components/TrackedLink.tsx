'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { trackCtaLab, trackCtaInvestir, trackOutboundExchange, type Exchange } from '@/lib/analytics'

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
    | { event: 'cta_investir'; location: string }
    | { event: 'outbound_exchange'; exchange: Exchange; location: string }
  )

export default function TrackedLink(props: Props) {
  const { href, className, target, rel, children } = props
  const ariaLabel = props['aria-label']

  const fire = () => {
    if (props.event === 'outbound_exchange') {
      trackOutboundExchange(props.exchange, props.location)
    } else if (props.event === 'cta_investir') {
      trackCtaInvestir(props.location)
    } else {
      trackCtaLab(props.location)
    }
  }

  // Until cta_investir, every tracked link left the site, so a bare <a> was
  // always right. /investir is a route of THIS app: a bare anchor there would
  // trade a soft navigation for a full reload on one of the two main entries of
  // the home — a regression nobody asked for when adding an event. Internal
  // hrefs therefore go through next/link, which keeps prefetch and client
  // navigation; the click handler fires either way.
  const isInternal = href.startsWith('/')

  if (isInternal) {
    return (
      <Link href={href} className={className} target={target} rel={rel} aria-label={ariaLabel} onClick={fire}>
        {children}
      </Link>
    )
  }

  return (
    <a href={href} className={className} target={target} rel={rel} aria-label={ariaLabel} onClick={fire}>
      {children}
    </a>
  )
}
