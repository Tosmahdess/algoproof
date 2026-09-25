// src/lib/backtest-segment-data.ts
//
// Server-side reader of the backtest segments file. Kept apart from backtest-segment.ts,
// which a client component imports: importing the JSON there would ship every bot's series
// to every visitor of every bot page.
import segments from '@/data/backtest-segments.json'
import type { BacktestSegment, BacktestTrade } from '@/lib/backtest-segment'

type FileEntry = {
  startDate: string
  launchDate: string
  startCapital: number
  points: { date: string; capital: number }[]
  trades: BacktestTrade[]
}

export function getBacktestSegment(slug: string): BacktestSegment | null {
  const e = (segments as unknown as Record<string, FileEntry>)[slug]
  return e
    ? { slug, startDate: e.startDate, launchDate: e.launchDate, startCapital: e.startCapital,
        points: e.points, trades: e.trades }
    : null
}
