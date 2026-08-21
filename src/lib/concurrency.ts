// src/lib/concurrency.ts
//
// Promise.all with a ceiling on how many mappers run at once.
//
// Why this exists: the fleet pages (/, /overview, /strategies,
// /strategies/[concept]) build their register by calling getBotWithStats once
// per bot, and each call is 3+ Supabase requests (bot row, trades paginated,
// perf_daily paginated). A bare `Promise.all(bots.map(...))` fires every one
// of them in the same tick — ~120 requests at 40 bots, ~350 once the 75-bot
// armada wave is published — every time the 30-minute per-slug cache goes
// cold. Supabase answers that with 429s and PostgREST timeouts, and the
// page throws on the first one (getAllBotsWithStatsUncached fails loud by
// design). Bounding the fan-out keeps the same total work and the same
// result, spread over a few hundred milliseconds instead of one burst.
//
// Semantics match Promise.all where it matters: results come back in input
// order, and the first rejection rejects the whole call. Mappers already
// started are not cancelled (Promise.all does not cancel either).

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(limit) || limit < 1) {
    // A limit of 0 would hang forever (no worker ever starts); a negative one
    // is a typo. Neither should degrade into "serial" or "unbounded" silently.
    throw new RangeError(`mapWithConcurrency: limit must be a positive integer, got ${limit}`)
  }
  const results: R[] = new Array(items.length)
  let next = 0

  async function worker(): Promise<void> {
    for (;;) {
      const i = next++
      if (i >= items.length) return
      results[i] = await fn(items[i], i)
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker)
  await Promise.all(workers)
  return results
}
