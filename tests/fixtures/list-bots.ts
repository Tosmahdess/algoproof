// What getListBots and getAssetSlices hand /overview, built from BotWithStats fixtures
// the way the bot_stats job builds it (lot 1b, D094): the row, its summary, no trades.
import type { BotWithStats } from '@/lib/types'
import type { SummaryBot } from '@/lib/list-bots'
import { summarizeBot } from '@/lib/bot-summary'
import { registerSlices, type SideSlices } from '@/lib/register-slices'

export function toSummaryBots(bots: BotWithStats[], today = new Date().toISOString().slice(0, 10)): SummaryBot[] {
  return bots.map(b => {
    const { all_trades: _t, perf_daily: _p, recent_trades: _r, list_perf_daily: _l, stats: _s, ...row } = b
    return { ...row, ...summarizeBot(b, today) }
  })
}

export function toAssetSlices(bots: BotWithStats[], assets: readonly string[]): Record<string, SideSlices> | undefined {
  if (!assets.length) return undefined
  return Object.fromEntries(bots.map(b => [b.slug, registerSlices(b, assets).assetSlices!]))
}
