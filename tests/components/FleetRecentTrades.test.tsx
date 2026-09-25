import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import FleetRecentTrades from '@/components/FleetRecentTrades'
import type { TradeWithBot } from '@/lib/types'

// Served on 2026-09-25: « LES 1 DERNIERS TRADES, TOUS BOTS » (audit P0-6). The
// heading interpolated the row count into a plural sentence, and the feed showed
// one row. Rule: the heading names the feed, the count sits in parentheses, and
// under three rows there is no feed worth a section.

const trade = (i: number): TradeWithBot => ({
  id: `t${i}`,
  opened_at: `2026-09-2${i}T08:00:00Z`,
  closed_at: `2026-09-2${i}T10:00:00Z`,
  asset: 'SEI-USDC',
  side: 'long',
  pnl: -10.57,
  reason: 'stop loss',
  bots: { name: 'Cassure de range d’ouverture H1 Hyperliquid', slug: 'orb-bf25', family: 'breakout', status: 'live' },
})

describe('FleetRecentTrades', () => {
  it('renders nothing under three trades', () => {
    const { container } = render(<FleetRecentTrades trades={[trade(1)]} />)
    expect(container.innerHTML).toBe('')
  })

  it('names the feed with its count in parentheses', () => {
    render(<FleetRecentTrades trades={[trade(1), trade(2), trade(3), trade(4), trade(5)]} />)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Derniers trades (5)')
  })
})
