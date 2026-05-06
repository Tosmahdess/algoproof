// Display constants — bots run with 1000€ paper capital, shown as-is.
export const PAPER_CAPITAL   = 1000
export const DISPLAY_CAPITAL = 1000

export function pnlEur(latestCapital: number): number {
  return latestCapital - PAPER_CAPITAL
}

export function pnlPct(latestCapital: number): number {
  return ((latestCapital - PAPER_CAPITAL) / PAPER_CAPITAL) * 100
}

export function fmtEur(n: number, decimals = 2): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}€`
}

export function fmtPct(n: number, decimals = 1): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`
}
