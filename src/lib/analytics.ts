// Thin typed layer over Vercel Web Analytics custom events.
// Single source of truth for event names — call these instead of track() directly
// so event names never drift across components.
import { track } from '@vercel/analytics'
import type { SubscribeSource } from '@/lib/subscribe'

export type Exchange = 'bybit' | 'hyperliquid' | 'kraken'

/** Email captured (newsletter, formation waitlist, membership interest — told apart by source). */
export function trackEmailSubscribe(source: SubscribeSource): void {
  track('email_subscribe', { source })
}

/** A bot detail page was viewed. */
export function trackViewBot(slug: string): void {
  track('view_bot', { slug })
}

/** A primary call-to-action toward the lab was clicked. `location` labels the call site. */
export function trackCtaLab(location: string): void {
  track('cta_lab', { location })
}

/** An outbound exchange link was clicked (Bybit is the affiliated one). */
export function trackOutboundExchange(exchange: Exchange, location: string): void {
  track('outbound_exchange', { exchange, location })
}
