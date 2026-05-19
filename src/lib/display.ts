// Display helpers — bots may run with different paper start capitals (see start-capitals.ts).
// Pass the bot's start_capital explicitly so funding/grid bots don't get measured against 1000€.

export const DEFAULT_PAPER_CAPITAL = 1000

export function pnlEur(latestCapital: number, startCapital: number = DEFAULT_PAPER_CAPITAL): number {
  return latestCapital - startCapital
}

export function pnlPct(latestCapital: number, startCapital: number = DEFAULT_PAPER_CAPITAL): number {
  if (startCapital === 0) return 0
  return ((latestCapital - startCapital) / startCapital) * 100
}

export function fmtEur(n: number, decimals = 2): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}€`
}

export function fmtPct(n: number, decimals = 1): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`
}
