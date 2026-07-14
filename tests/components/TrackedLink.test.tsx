import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TrackedLink from '@/components/TrackedLink'
import { trackCtaLab, trackOutboundExchange } from '@/lib/analytics'

vi.mock('@/lib/analytics', () => ({
  trackCtaLab: vi.fn(),
  trackOutboundExchange: vi.fn(),
}))

describe('TrackedLink', () => {
  beforeEach(() => {
    vi.mocked(trackCtaLab).mockClear()
    vi.mocked(trackOutboundExchange).mockClear()
  })

  it('renders an anchor with href and children', () => {
    render(
      <TrackedLink href="https://lab.algoproof.fr" event="cta_lab" location="labo">
        Aller au labo
      </TrackedLink>,
    )
    expect(screen.getByRole('link', { name: 'Aller au labo' })).toHaveAttribute(
      'href',
      'https://lab.algoproof.fr',
    )
  })

  it('fires cta_lab with the location on click', () => {
    render(
      <TrackedLink href="/labo" event="cta_lab" location="home-hero">
        Le labo
      </TrackedLink>,
    )
    fireEvent.click(screen.getByRole('link', { name: 'Le labo' }))
    expect(trackCtaLab).toHaveBeenCalledWith('home-hero')
    expect(trackOutboundExchange).not.toHaveBeenCalled()
  })

  it('fires outbound_exchange with exchange + location on click', () => {
    render(
      <TrackedLink href="https://www.bybit.eu" event="outbound_exchange" exchange="bybit" location="start">
        Bybit
      </TrackedLink>,
    )
    fireEvent.click(screen.getByRole('link', { name: 'Bybit' }))
    expect(trackOutboundExchange).toHaveBeenCalledWith('bybit', 'start')
    expect(trackCtaLab).not.toHaveBeenCalled()
  })

  it('passes through target and rel, and does not leak event props to the DOM', () => {
    render(
      <TrackedLink
        href="https://x.com"
        event="outbound_exchange"
        exchange="kraken"
        location="start"
        target="_blank"
        rel="noopener noreferrer"
      >
        Kraken
      </TrackedLink>,
    )
    const link = screen.getByRole('link', { name: 'Kraken' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).not.toHaveAttribute('event')
    expect(link).not.toHaveAttribute('location')
    expect(link).not.toHaveAttribute('exchange')
  })
})
