// tests/lib/list-bots.test.ts
//
// How a list turns `bots` + `bot_stats` into what it renders (lot 1b, D094). Three cases,
// three behaviours (Fable, 03/10):
//   - no row, an unreadable row, or a row of another formula revision -> the bot is
//     computed LIVE with the same function, and the log names it;
//   - an OLD row -> served anyway, and the log counts it: falling back on age would turn
//     « the job died » into « every render pays 3 requests per bot », the very cost the
//     table removes;
//   - a good row -> served, nothing fetched.
import { describe, it, expect, vi } from 'vitest'
import type { Bot } from '@/lib/types'
import { FORMULA_REV, type BotSummary } from '@/lib/bot-summary'
import { resolveListBots, STALE_AFTER_MS, type BotWithStatsRow } from '@/lib/list-bots'

const NOW = new Date('2026-10-03T14:10:00Z')

const summary = (trades: number): BotSummary => {
  const stats = { win_rate: 0.5, profit_factor: 1.2, max_drawdown: 0.03, total_trades: trades,
    latest_capital: 1012 }
  return { stats, slices: { all: stats, long: stats, short: { ...stats, total_trades: 0 } },
    sides: { long: true, short: false }, spark30: [1000, 1012], ledgerTail: [] }
}

const bot = (slug: string, stats: BotWithStatsRow['bot_stats']): BotWithStatsRow => ({
  id: `${slug}-id`, slug, name: slug, status: 'paper', start_capital: 1000, bot_stats: stats,
}) as unknown as BotWithStatsRow

const stored = (trades: number, over: Partial<NonNullable<BotWithStatsRow['bot_stats']>> = {}) => ({
  formula_rev: FORMULA_REV, computed_at: '2026-10-03T14:02:00Z', computed_for: '2026-10-03',
  summary: summary(trades), ...over,
})

function logger() {
  return { error: vi.fn(), warn: vi.fn() }
}

describe('resolveListBots', () => {
  it('serves a good row without computing anything', async () => {
    const live = vi.fn()
    const log = logger()
    const got = await resolveListBots([bot('a', stored(7))], live, NOW, log)
    expect(live).not.toHaveBeenCalled()
    expect(got[0].stats.total_trades).toBe(7)
    expect(got[0].slug).toBe('a')
    expect(got[0].start_capital).toBe(1000)
    expect(got[0]).not.toHaveProperty('bot_stats')
    expect(log.error).not.toHaveBeenCalled()
  })

  it('computes live, and logs, a bot without a row', async () => {
    const log = logger()
    const got = await resolveListBots([bot('a', null)], async () => summary(3), NOW, log)
    expect(got[0].stats.total_trades).toBe(3)
    expect(log.error.mock.calls.flat().join(' ')).toMatch(/a.*missing/)
  })

  it('computes live a row of another formula revision (never serves old arithmetic)', async () => {
    const log = logger()
    const got = await resolveListBots([bot('a', stored(7, { formula_rev: FORMULA_REV + 1 }))],
      async () => summary(3), NOW, log)
    expect(got[0].stats.total_trades).toBe(3)
    expect(log.error.mock.calls.flat().join(' ')).toMatch(/formula_rev/)
  })

  it('computes live a row it cannot parse', async () => {
    const log = logger()
    const got = await resolveListBots([bot('a', stored(7, { summary: { stats: null } as unknown as BotSummary }))],
      async () => summary(3), NOW, log)
    expect(got[0].stats.total_trades).toBe(3)
    expect(log.error.mock.calls.flat().join(' ')).toMatch(/unreadable/)
  })

  it('SERVES an old row, and says how many are old', async () => {
    const live = vi.fn()
    const log = logger()
    const old = new Date(NOW.getTime() - STALE_AFTER_MS - 60_000).toISOString()
    const got = await resolveListBots([bot('a', stored(7, { computed_at: old })), bot('b', stored(2))],
      live, NOW, log)
    expect(live).not.toHaveBeenCalled()
    expect(got.map(b => b.stats.total_trades)).toEqual([7, 2])
    expect(log.warn).toHaveBeenCalledTimes(1)
    expect(log.warn.mock.calls[0].join(' ')).toMatch(/1 .*old/)
  })

  it('accepts the embed as a one-element array too (PostgREST shape varies with the FK)', async () => {
    const got = await resolveListBots([bot('a', [stored(7)] as unknown as BotWithStatsRow['bot_stats'])],
      vi.fn(), NOW, logger())
    expect(got[0].stats.total_trades).toBe(7)
  })

  it('keeps the input order, and drops (with a log) a bot whose live computation finds nothing', async () => {
    const log = logger()
    const got = await resolveListBots([bot('a', stored(1)), bot('b', null), bot('c', stored(3))],
      async () => null, NOW, log)
    expect(got.map(b => b.slug)).toEqual(['a', 'c'])
    expect(log.error.mock.calls.flat().join(' ')).toMatch(/b/)
  })
})
