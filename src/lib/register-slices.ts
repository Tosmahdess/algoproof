// What /overview's client register needs from a bot's trades, computed on the server.
//
// Lot 1b (2026-10-03, D094): the page served 1.8 MB, nearly all of it every trade of
// every bot, so the browser could recompute a row when the reader picked « long » or
// « short ». The register can change the side, never the asset set (it can only clear
// the one the URL carried), so three slices per asset set cover everything it shows:
// computed HERE with sliceBotStats, the very function the browser ran.
import { sliceBotStats } from './stats'
import type { BotStats, StatsTrade } from './types'

export type SideSlices = Record<'all' | 'long' | 'short', BotStats>

type SliceInput = { stats: BotStats; all_trades: StatsTrade[]; start_capital: number }

function sliceSet(b: SliceInput, assets: readonly string[]): SideSlices {
  return {
    all: sliceBotStats(b, 'all', assets),
    long: sliceBotStats(b, 'long', assets),
    short: sliceBotStats(b, 'short', assets),
  }
}

export function registerSlices(b: SliceInput, urlAssets: readonly string[]): {
  slices: SideSlices
  assetSlices?: SideSlices
  sides: { long: boolean; short: boolean }
} {
  return {
    slices: sliceSet(b, []),
    ...(urlAssets.length ? { assetSlices: sliceSet(b, urlAssets) } : {}),
    sides: {
      long: b.all_trades.some(t => t.side === 'long'),
      short: b.all_trades.some(t => t.side === 'short'),
    },
  }
}
