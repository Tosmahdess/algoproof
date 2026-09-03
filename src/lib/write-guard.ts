import { supabaseServer } from '@/lib/supabase-server'

/**
 * Burst guard for the two public write routes.
 *
 * `/api/comments` and `/api/subscribe` accept an anonymous POST, insert a row,
 * and fire one Telegram message per accepted row. Nothing else bounds them: no
 * auth, no rate limit, no moderation, and comments are published immediately.
 * A single script therefore costs unbounded rows, unbounded operator
 * notifications, and unbounded public text on bot pages.
 *
 * This counts rows written in the last WINDOW_MINUTES and refuses above
 * WINDOW_MAX. It is a GLOBAL ceiling, not per-IP fairness: it bounds the damage
 * without a new table and without trusting a spoofable forwarding header. Real
 * per-identity pacing is a separate piece of work.
 */
export const WINDOW_MINUTES = 10
export const WINDOW_MAX = 30

export type BurstVerdict = 'ok' | 'over' | 'unknown'

export type GuardedTable = 'comments' | 'email_subscribers'

export async function recentWriteVerdict(table: GuardedTable): Promise<BurstVerdict> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString()

  const { count, error } = await supabaseServer
    .from(table)
    .select('*', { count: 'exact', head: true })
    .gte('created_at', since)

  // A guard that cannot count must say so rather than answer "fine". Each
  // caller decides what an unknown count means for its own route: see the
  // comment at each call site.
  if (error || count === null || count === undefined) {
    console.error(
      `[write-guard] could not count recent rows on ${table}:`,
      error?.message ?? 'no count returned',
    )
    return 'unknown'
  }

  return count >= WINDOW_MAX ? 'over' : 'ok'
}
