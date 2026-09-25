// Lot 5 of the design audit (2026-09-25, conception §5.6): the bot sheet keeps
// its order and gets four touches. The assets fold when there are many (« 25
// actifs »), the family reads in muted text under the name, the four metrics are
// tiles, and no warning glyph or emoji decorates a sentence.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { prodBot } from '../fixtures/bots'

vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('unexpected notFound') },
}))

const bot = vi.hoisted(() => ({ current: null as unknown }))
vi.mock('@/lib/queries', () => ({
  getBotWithStats: async () => bot.current,
  getBotSlugs: async () => [],
}))
vi.mock('@/lib/screening', () => ({ getProvenanceForBot: async () => null }))

import BotPage from '@/app/strategies/bot/[slug]/page'

const MANY = Array.from({ length: 25 }, (_, i) => `ASSET${i + 1}`)

describe('/strategies/bot/[slug] — header', () => {
  it('folds a long asset list under « N actifs », closed, and lists them inside', async () => {
    bot.current = prodBot('orb-bf25', { assets: MANY, family: 'breakout', stats: { total_trades: 40, win_rate: 0.5, profit_factor: 1.1, max_drawdown: 0.05, latest_capital: 1010 } })
    render(await BotPage({ params: Promise.resolve({ slug: 'orb-bf25' }) }))
    const fold = screen.getByTestId('bot-assets') as HTMLDetailsElement
    expect(fold.tagName).toBe('DETAILS')
    expect(fold.open).toBe(false)
    expect(fold.querySelector('summary')!.textContent).toMatch(/25 actifs/)
    expect(within(fold).getByText(/ASSET25/)).toBeTruthy()
  })

  it('writes a short asset list inline, no fold', async () => {
    bot.current = prodBot('v1-spot', { assets: ['BTC', 'ETH'], family: 'trend', stats: { total_trades: 40, win_rate: 0.5, profit_factor: 1.1, max_drawdown: 0.05, latest_capital: 1010 } })
    render(await BotPage({ params: Promise.resolve({ slug: 'v1-spot' }) }))
    expect(screen.queryByTestId('bot-assets')).toBeNull()
    expect(screen.getByTestId('bot-header').textContent).toMatch(/BTC, ETH/)
  })

  it('names the family in muted text under the name', async () => {
    bot.current = prodBot('v1-spot', { assets: ['BTC'], family: 'trend', stats: { total_trades: 40, win_rate: 0.5, profit_factor: 1.1, max_drawdown: 0.05, latest_capital: 1010 } })
    render(await BotPage({ params: Promise.resolve({ slug: 'v1-spot' }) }))
    const family = screen.getByTestId('bot-family')
    expect(family.textContent).toBe('Suivi de tendance')
    expect(family.className).toMatch(/text-muted/)
    const header = screen.getByTestId('bot-header')
    expect(header.innerHTML.indexOf('<h1')).toBeLessThan(header.innerHTML.indexOf('data-testid="bot-family"'))
  })

  it('carries no warning glyph and no emoji anywhere on the page', async () => {
    bot.current = prodBot('v1-spot', { assets: ['BTC'], family: 'trend', stats: { total_trades: 7, win_rate: 0.5, profit_factor: 1.1, max_drawdown: 0.05, latest_capital: 1010 } })
    const { container } = render(await BotPage({ params: Promise.resolve({ slug: 'v1-spot' }) }))
    expect(container.textContent).not.toMatch(/[⚠\u{1F300}-\u{1FAFF}]/u)
    // the low-sample sentence stays, as words
    expect(container.textContent).toMatch(/Échantillon faible/)
  })
})
