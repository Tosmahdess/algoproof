// The 30-day curves of /overview (lot 4 of the design audit, 2026-09-25,
// conception §5.2): the real-money bots each in their own line, and ONE line
// for the simulation, never the twelve most-traded bots in twelve colours.
//
// The simulation line is the sum, day by day, of every paper bot's P&L: its
// last known capital minus its start capital. A bot with no point yet on a day
// counts for nothing; a bot whose last point is older carries it forward. The
// value is a P&L, not a capital: the paper bots have different start capitals,
// so a summed capital would say nothing.
import type { PerfDaily } from './types'

export interface CurvePoint {
  date: string
  capital: number
}

interface SeriesBot {
  start_capital: number
  perf_daily: readonly PerfDaily[]
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function simulationTotalSeries(bots: readonly SeriesBot[], cutoffStr: string): CurvePoint[] {
  const sorted = bots.map(b => ({
    start: b.start_capital,
    points: [...b.perf_daily].sort((a, z) => (a.date < z.date ? -1 : a.date > z.date ? 1 : 0)),
  }))
  const dates = [...new Set(sorted.flatMap(b => b.points.map(p => p.date)).filter(d => d >= cutoffStr))].sort()
  return dates.map(date => {
    let total = 0
    for (const b of sorted) {
      let last: PerfDaily | undefined
      for (const p of b.points) {
        if (p.date > date) break
        last = p
      }
      if (last) total += last.capital - b.start
    }
    return { date, capital: round2(total) }
  })
}
