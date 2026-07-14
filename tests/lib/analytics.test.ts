import { describe, it, expect, vi, beforeEach } from 'vitest'
import { track } from '@vercel/analytics'
import {
  trackEmailSubscribe,
  trackViewBot,
  trackCtaLab,
  trackOutboundExchange,
} from '@/lib/analytics'

vi.mock('@vercel/analytics', () => ({ track: vi.fn() }))

describe('analytics helpers', () => {
  beforeEach(() => {
    vi.mocked(track).mockClear()
  })

  it('trackEmailSubscribe fires email_subscribe with the source', () => {
    trackEmailSubscribe('formation-waitlist')
    expect(track).toHaveBeenCalledWith('email_subscribe', { source: 'formation-waitlist' })
  })

  it('trackViewBot fires view_bot with the slug', () => {
    trackViewBot('v1-spot')
    expect(track).toHaveBeenCalledWith('view_bot', { slug: 'v1-spot' })
  })

  it('trackCtaLab fires cta_lab with the location', () => {
    trackCtaLab('home-hero')
    expect(track).toHaveBeenCalledWith('cta_lab', { location: 'home-hero' })
  })

  it('trackOutboundExchange fires outbound_exchange with exchange + location', () => {
    trackOutboundExchange('bybit', 'start')
    expect(track).toHaveBeenCalledWith('outbound_exchange', { exchange: 'bybit', location: 'start' })
  })
})
