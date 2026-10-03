// src/lib/list-bots.ts
//
// What a list renders for each bot (lot 1b, D094): its `bots` row and its summary, read
// from bot_stats when the stored row can be trusted, computed live otherwise. Pure: the
// query lives in queries.ts (getListBots), which passes the live computation in.
import type { Bot } from '@/lib/types'
import { FORMULA_REV, parseSummary, type BotSummary } from '@/lib/bot-summary'

/** A bot as the lists use it: its row, its figures, its line, its ledger window. */
export type SummaryBot = Bot & BotSummary

type StoredStats = {
  formula_rev: number
  computed_at: string
  computed_for: string
  summary: unknown
}

/** A `bots` row with its bot_stats row embedded (PostgREST: object, array or null). */
export type BotWithStatsRow = Bot & { bot_stats: StoredStats | StoredStats[] | null }

/** The job runs every hour; three missed runs is when an old row gets reported. */
export const STALE_AFTER_MS = 3 * 60 * 60 * 1000

type Log = { error: (...a: unknown[]) => void; warn: (...a: unknown[]) => void }

export async function resolveListBots(
  rows: BotWithStatsRow[],
  live: (bot: Bot) => Promise<BotSummary | null>,
  now: Date = new Date(),
  log: Log = console,
): Promise<SummaryBot[]> {
  let old = 0
  const liveSlugs: string[] = []
  const out = await Promise.all(rows.map(async ({ bot_stats, ...bot }) => {
    const stored = Array.isArray(bot_stats) ? bot_stats[0] ?? null : bot_stats
    let why: string | null = null
    if (!stored) why = 'missing'
    else if (stored.formula_rev !== FORMULA_REV) why = `formula_rev ${stored.formula_rev} != ${FORMULA_REV}`
    if (!why && stored) {
      const summary = parseSummary(stored.summary)
      if (summary) {
        if (now.getTime() - Date.parse(stored.computed_at) > STALE_AFTER_MS) old++
        return { ...(bot as Bot), ...summary }
      }
      why = 'unreadable'
    }
    liveSlugs.push(`${bot.slug} (${why})`)
    const summary = await live(bot as Bot)
    if (!summary) {
      log.error(`[bot-stats] ${bot.slug}: live computation found no public bot, left out`)
      return null
    }
    return { ...(bot as Bot), ...summary }
  }))
  // ONE line per render, not one per bot: a formula bump sends every bot down this path.
  if (liveSlugs.length) {
    log.error(`[bot-stats] ${liveSlugs.length} computed live: ${liveSlugs.slice(0, 20).join(', ')}`
      + (liveSlugs.length > 20 ? `, and ${liveSlugs.length - 20} more` : ''))
  }
  if (old) log.warn(`[bot-stats] ${old} rows older than ${STALE_AFTER_MS / 3_600_000} h served: is the job running?`)
  return out.filter((b): b is SummaryBot => b !== null)
}
