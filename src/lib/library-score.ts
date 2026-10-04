// src/lib/library-score.ts
//
// « Les plus solides en simulation » (chantier bibliotheque, lot 2c, validated by the
// owner 01/10, design reviewed by Fable 04/10). An IDEA is ranked on the simulation trades
// of all its launched variants, stopped ones included (dropping them would rank the
// survivors of the idea, not the idea).
//
// - One observation = one ENTRY DAY of the idea. Variants of an idea often take the same
//   trade, and assets entering on the same day move together: a t pooled per trade counted
//   one day N times (learnings 18/09: pooled t 1.3-1.9, clustered 0.40-0.57). Several
//   distinct H1 trades of one day merge too: conservative, and said on the page.
// - Its value = the mean of that day's gains, each divided by its bot's equity when the
//   trade opened (rebuilt from the bot's own closed trades). Not euros: the fiche rescales
//   paper amounts by the replay's end capital (buildTimeline `scale`), and compounding
//   drifts the August bots away from the October ones.
// - Score = one-sided 90 % lower bound of the mean, mean - t(0.90, n-1) * s / sqrt(n),
//   shown as « gain prudent » per 1 000 € committed, from 30 entry days only. Student is
//   kept: losses are capped by the stop, the fat tail is on the gain side and pulls the
//   bound DOWN.
//
// Pure: the query lives in library-score-data.ts. The same function will read the
// backtest segment's trades for « Backtest contre simulation ».

export const SCORE_MIN_DAYS = 30
const PER = 1000                       // shown per 1 000 € committed

/** One-sided 90 % Student quantile, Cornish-Fisher in 1/df (error < 1e-4 from df 10). */
export function studentT90(df: number): number {
  const z = 1.2815515655446004
  const z3 = z ** 3, z5 = z ** 5, z7 = z ** 7
  return z + (z3 + z) / (4 * df) + (5 * z5 + 16 * z3 + 3 * z) / (96 * df ** 2)
    + (3 * z7 + 19 * z5 + 17 * z3 - 15 * z) / (384 * df ** 3)
}

type Closed = { opened_at: string; closed_at: string; pnl: number }

/** Each trade's gain as a fraction of the equity reached when it opened: start capital
 *  plus every gain of this bot closed strictly before. Day = UTC date of the entry. */
export function returnsAtEntry<T extends Closed>(trades: T[], startCapital: number): (T & { day: string; r: number })[] {
  const byClose = [...trades].sort((a, b) => Date.parse(a.closed_at) - Date.parse(b.closed_at))
  return [...trades]
    .sort((a, b) => Date.parse(a.opened_at) - Date.parse(b.opened_at))
    .map(t => {
      const at = Date.parse(t.opened_at)
      let equity = startCapital
      for (const c of byClose) {
        if (Date.parse(c.closed_at) >= at) break
        equity += c.pnl
      }
      return { ...t, day: t.opened_at.slice(0, 10), r: t.pnl / equity }
    })
}

export type IdeaScore = {
  days: number
  trades: number
  /** Mean gain per trade, per 1 000 € committed (over entry days). */
  mean: number | null
  /** The 90 % lower bound, per 1 000 €; null until ranked. */
  prudent: number | null
  ranked: boolean
}

export function ideaScore(obs: { day: string; r: number }[]): IdeaScore {
  const byDay = new Map<string, number[]>()
  for (const o of obs) byDay.set(o.day, [...(byDay.get(o.day) ?? []), o.r])
  const xs = [...byDay.values()].map(rs => (rs.reduce((s, r) => s + r, 0) / rs.length) * PER)
  const n = xs.length
  const mean = n ? xs.reduce((s, x) => s + x, 0) / n : null
  const ranked = n >= SCORE_MIN_DAYS
  let prudent: number | null = null
  if (ranked && mean !== null) {
    const sd = Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1))
    prudent = mean - studentT90(n - 1) * sd / Math.sqrt(n)
  }
  return { days: n, trades: obs.length, mean, prudent, ranked }
}

export type ScoreRow = {
  bot_id: string
  idea_key: string
  start_capital: number
  is_paper: boolean
  paper_since: string | null
  opened_at: string
  closed_at: string | null
  pnl: number
}

/** idea_key -> score, over the simulation trades: closed, paper, opened since the bot's
 *  launch when it has a launch date (the August wave heads have none: all their ledger
 *  is simulation; a naive `opened_at >= paper_since` would drop them all). */
export function libraryScores(rows: ScoreRow[]): Map<string, IdeaScore> {
  const byBot = new Map<string, ScoreRow[]>()
  for (const r of rows) {
    if (r.closed_at === null) continue
    byBot.set(r.bot_id, [...(byBot.get(r.bot_id) ?? []), r])
  }
  const byIdea = new Map<string, { day: string; r: number }[]>()
  for (const trades of byBot.values()) {
    const closed = trades as (ScoreRow & { closed_at: string })[]
    for (const t of returnsAtEntry(closed, closed[0].start_capital)) {
      if (!t.is_paper) continue
      if (t.paper_since && Date.parse(t.opened_at) < Date.parse(t.paper_since)) continue
      byIdea.set(t.idea_key, [...(byIdea.get(t.idea_key) ?? []), { day: t.day, r: t.r }])
    }
  }
  return new Map([...byIdea].map(([k, obs]) => [k, ideaScore(obs)]))
}

/** The selection backtest of an idea's launched variants, in the score's unit (mean gain
 *  per trade for 1 000 €, one value per entry day): every variant's segment trades opened
 *  up to its freeze (the replay after the freeze is not the selection). Null without one. */
export function selectionMean(segments: { freezeDate: string; startCapital: number; trades: Closed[] }[]): number | null {
  const obs: { day: string; r: number }[] = []
  for (const s of segments) {
    for (const t of returnsAtEntry(s.trades, s.startCapital)) {
      if (t.day <= s.freezeDate) obs.push({ day: t.day, r: t.r })
    }
  }
  return ideaScore(obs).mean
}
