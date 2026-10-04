// src/lib/library-score-data.ts
//
// The rows behind the lot 2c score (library-score.ts): every trade of a library bot,
// stopped variants included, with its bot's launch date and start capital. ~130 trades
// on 2026-10-04, a few thousand after months at 300 bots: one paged read, cached.
//
// One cache entry (key + tag), shared by every route that shows a score: /bibliotheque
// and /bibliotheque/<idee> read the same instant of the same figure.
import { unstable_cache } from 'next/cache'
import { supabase } from './supabase'
import { paginateAll } from './paginate'
import { getStartCapital } from './start-capitals'
import { libraryScores, selectionMean, type IdeaScore, type ScoreRow } from './library-score'
import { readBacktestSegment } from './backtest-segment-data'

type Raw = {
  bot_id: string
  opened_at: string
  closed_at: string | null
  pnl: number
  is_paper: boolean
  bots: { slug: string; idea_key: string; paper_since: string | null }
}

export async function fetchScoreRows(): Promise<ScoreRow[]> {
  const raw = await paginateAll<Raw>(async (from, to) => {
    const { data, error } = await supabase
      .from('trades')
      .select('id,bot_id,opened_at,closed_at,pnl,is_paper,bots!inner(slug,idea_key,paper_since)')
      .not('bots.idea_key', 'is', null)
      .order('id')
      .range(from, to)
    if (error) throw new Error(`library score trades: ${error.message}`)
    return (data ?? []) as unknown as Raw[]
  })
  return raw.map(t => ({
    bot_id: t.bot_id,
    idea_key: t.bots.idea_key,
    start_capital: getStartCapital(t.bots.slug),
    is_paper: t.is_paper,
    paper_since: t.bots.paper_since,
    opened_at: t.opened_at,
    closed_at: t.closed_at,
    pnl: Number(t.pnl),
  }))
}

/** idea_key -> score, as a plain object (the data cache stores JSON). */
export const getLibraryScores = unstable_cache(
  async (): Promise<Record<string, IdeaScore>> => Object.fromEntries(libraryScores(await fetchScoreRows())),
  ['library-scores'],
  { revalidate: 1800, tags: ['library'] },
)

/** The selection backtest of an idea's launched variants (« Backtest contre simulation »),
 *  read only once the idea is ranked: a few segment rows. A variant whose segment is
 *  missing or unreadable is left out; null when none is readable. */
export const getSelectionMean = unstable_cache(
  async (slugs: string[]): Promise<number | null> => {
    const reads = await Promise.all(slugs.map(readBacktestSegment))
    const segments = reads.flatMap(r => (r.kind === 'ok' ? [r.segment] : []))
    return segments.length ? selectionMean(segments) : null
  },
  ['library-selection-mean'],
  { revalidate: 1800, tags: ['library'] },
)
