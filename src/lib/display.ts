// Display constants — bots run internally with 1000€ paper capital,
// but we display as if users invest 100€ (scaling factor 0.1).
export const PAPER_CAPITAL  = 1000   // internal paper capital per bot
export const DISPLAY_CAPITAL = 100   // shown to users

// Convert internal capital (1000-based) to display capital (100-based)
export function toDisplayCapital(capital: number): number {
  return (capital - PAPER_CAPITAL) * (DISPLAY_CAPITAL / PAPER_CAPITAL) + DISPLAY_CAPITAL
}

// Latent profit in euros on 100€ base
export function latentPnlEur(latestCapital: number): number {
  return (latestCapital - PAPER_CAPITAL) * (DISPLAY_CAPITAL / PAPER_CAPITAL)
}

// P&L percentage (same regardless of display capital)
export function pnlPct(latestCapital: number): number {
  return ((latestCapital - PAPER_CAPITAL) / PAPER_CAPITAL) * 100
}

export function fmtEur(n: number, decimals = 2): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}€`
}

export function fmtPct(n: number, decimals = 1): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`
}
