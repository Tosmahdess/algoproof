// Counter-audit 2026-09-26 (item 24): on a phone the bot's result sat at 1 120 px, under
// a three-line title and the three sentences. The header now says it right under the
// name, with the figures the page already computes below (same helpers as the
// real-money cards), and says nothing for a bot that has not traded.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { prodBot } from '../fixtures/bots'

vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('unexpected notFound') },
  usePathname: () => '/strategies/bot/orb-bf25',
}))
vi.mock('@/lib/screening', () => ({ getProvenanceForBot: async () => null }))

const current = vi.hoisted(() => ({ bot: null as unknown }))
vi.mock('@/lib/queries', () => ({
  getBotSlugs: async () => [],
  getBotWithStats: async () => current.bot,
}))

import BotFichePage from '@/app/strategies/bot/[slug]/page'

const stats = { total_trades: 282, win_rate: 0.45, profit_factor: 0.97, max_drawdown: 0.291, latest_capital: 963.31 }

describe('/strategies/bot/[slug] — the result under the name', () => {
  it('says the result since the start and the trade count right under the title', async () => {
    current.bot = prodBot('orb-bf25', { status: 'live', start_capital: 1000, stats })
    render(await BotFichePage({ params: Promise.resolve({ slug: 'orb-bf25' }) }))
    const line = screen.getByTestId('bot-result')
    const text = line.textContent!.replace(/\s/g, ' ')
    expect(text).toMatch(/−3,7 %/)
    expect(text).toMatch(/−36,69 € depuis le départ/)
    expect(text).toMatch(/282 trades/)
    expect(screen.getByTestId('bot-header').contains(line)).toBe(true)
  })

  it('says nothing for a bot that has not traded yet', async () => {
    current.bot = prodBot('orb-bf25', { status: 'paper', start_capital: 1000, stats: { ...stats, total_trades: 0, latest_capital: 1000 } })
    render(await BotFichePage({ params: Promise.resolve({ slug: 'orb-bf25' }) }))
    expect(screen.queryByTestId('bot-result')).toBeNull()
  })
})
