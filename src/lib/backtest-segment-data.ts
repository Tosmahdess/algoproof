// src/lib/backtest-segment-data.ts
//
// Server-side reader of the backtest segments file. Kept apart from backtest-segment.ts,
// which a client component imports: importing the JSON there would ship every bot's series
// to every visitor of every bot page.
import segments from '@/data/backtest-segments.json'
import type { BacktestSegment } from '@/lib/backtest-segment'

type FileEntry = { launchDate: string; points: { date: string; capital: number }[] }

export function getBacktestSegment(slug: string): BacktestSegment | null {
  const e = (segments as Record<string, FileEntry>)[slug]
  return e ? { slug, launchDate: e.launchDate, points: e.points } : null
}
