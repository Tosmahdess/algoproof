import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ReactNode } from 'react'
import TrackedLink from '@/components/TrackedLink'
import { trackCtaLab, trackCtaInvestir, trackOutboundExchange } from '@/lib/analytics'

vi.mock('@/lib/analytics', () => ({
  trackCtaLab: vi.fn(),
  trackCtaInvestir: vi.fn(),
  trackOutboundExchange: vi.fn(),
}))

// Rendered with a marker attribute so a test can tell a next/link apart from a
// bare <a>: both are anchors in the DOM, and the difference that matters (client
// navigation and prefetch) is invisible in jsdom.
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} data-nextlink="true" {...rest}>{children}</a>
  ),
}))

describe('TrackedLink', () => {
  beforeEach(() => {
    vi.mocked(trackCtaLab).mockClear()
    vi.mocked(trackCtaInvestir).mockClear()
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

  it('fires cta_investir with the location on click', () => {
    render(
      <TrackedLink href="/investir" event="cta_investir" location="home-hero">
        Les sociétés
      </TrackedLink>,
    )
    fireEvent.click(screen.getByRole('link', { name: 'Les sociétés' }))
    expect(trackCtaInvestir).toHaveBeenCalledWith('home-hero')
    expect(trackCtaLab).not.toHaveBeenCalled()
    expect(trackOutboundExchange).not.toHaveBeenCalled()
  })

  // The lab CTA leaves the site, so a bare <a> is right for it. /investir is a
  // route of THIS app: rendering it as a bare anchor would trade a soft
  // navigation for a full reload on the most prominent link of the home, which
  // is a regression nobody asked for when adding an analytics event.
  it('routes an internal href through next/link, an external one through a bare anchor', () => {
    render(
      <TrackedLink href="/investir" event="cta_investir" location="home-hero">
        Interne
      </TrackedLink>,
    )
    expect(screen.getByRole('link', { name: 'Interne' })).toHaveAttribute('data-nextlink', 'true')

    render(
      <TrackedLink href="https://lab.algoproof.fr" event="cta_lab" location="home-hero">
        Externe
      </TrackedLink>,
    )
    expect(screen.getByRole('link', { name: 'Externe' })).not.toHaveAttribute('data-nextlink')
  })

  it('still tracks when an internal link is clicked through next/link', () => {
    render(
      <TrackedLink href="/investir#methode" event="cta_investir" location="home-hero-methode">
        Méthode
      </TrackedLink>,
    )
    fireEvent.click(screen.getByRole('link', { name: 'Méthode' }))
    expect(trackCtaInvestir).toHaveBeenCalledWith('home-hero-methode')
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
