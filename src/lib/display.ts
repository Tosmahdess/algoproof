// Display helpers — bots may run with different paper start capitals (see start-capitals.ts).
// Pass the bot's start_capital explicitly so funding/grid bots don't get measured against 1000€.

export const DEFAULT_PAPER_CAPITAL = 1000

// Below this trade count, PF / win-rate / return are not statistically meaningful
// and must be flagged so visitors don't read a 1-6 trade bot as a real edge.
export const LOW_SAMPLE_TRADES = 20

export function isLowSample(totalTrades: number): boolean {
  return totalTrades > 0 && totalTrades < LOW_SAMPLE_TRADES
}

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

// Profit factor and win rate are meaningless for carry/portage bots (grid, funding-rate
// harvesting): they run by construction with almost no losing round-trips, which produces
// absurd headline numbers (PF 999.00, WR 100%) that read as a broken metric rather than a
// real edge. These bots should be judged on P&L/drawdown instead.
export const CARRY_METRIC_TOOLTIP = 'Métrique non pertinente pour le portage : voir le P&L.'

export function isCarryFamily(family: string | null | undefined): boolean {
  return family === 'carry'
}

export function fmtPfForFamily(family: string | null | undefined, pf: number): string {
  return isCarryFamily(family) ? '—' : pf.toFixed(2)
}

export function fmtWinRateForFamily(family: string | null | undefined, winRate: number): string {
  return isCarryFamily(family) ? '—' : `${(winRate * 100).toFixed(1)}%`
}
