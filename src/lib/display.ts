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

// Conception C4 (2026-09-25): French figures everywhere the reader sees a number.
// Decimal comma, narrow no-break space (U+202F) between thousands and before the
// unit, the real minus sign (U+2212). Written by hand rather than through
// Intl.NumberFormat: the runtime's ICU data returns U+202F or U+00A0 depending on
// the platform, and a test that passed on one machine failed on the next
// (src/lib/screening.ts learnt the same lesson for `count`).
export const NARROW_NBSP = ' '
// Lot 5 (2026-09-25, lot 6's leftover): Inter renders U+202F under 2 px at 13 px,
// so « 1 406 » read « 1406 » outside the mono font. The thousands take a regular
// no-break space (U+00A0): unbreakable, and visibly a space in every face. The
// narrow one stays before € and %, where the glyph beside it carries the gap.
export const GROUP_SPACE = ' '
export const MINUS = '−'

/** |n| with `decimals` decimals, French: `1 234,50`. No sign. */
export function frNumber(n: number, decimals: number): string {
  const [int, frac] = Math.abs(n).toFixed(decimals).split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP_SPACE)
  return frac === undefined ? grouped : `${grouped},${frac}`
}

/** Signed French number: `+272,73`, `−64,74`. A rounded zero is a flat result: `+0,00`. */
export function frSigned(n: number, decimals: number): string {
  const body = frNumber(n, decimals)
  const negative = n < 0 && Number(Math.abs(n).toFixed(decimals)) !== 0
  return `${negative ? MINUS : '+'}${body}`
}

export function fmtEur(n: number, decimals = 2): string {
  return `${frSigned(n, decimals)}${NARROW_NBSP}€`
}

export function fmtPct(n: number, decimals = 1): string {
  return `${frSigned(n, decimals)}${NARROW_NBSP}%`
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
  return isCarryFamily(family) ? '—' : frNumber(pf, 2)
}

export function fmtWinRateForFamily(family: string | null | undefined, winRate: number): string {
  return isCarryFamily(family) ? '—' : `${frNumber(winRate * 100, 1)}${NARROW_NBSP}%`
}

// Unified display rule: PF/WR are meaningless for carry bots (no win/loss
// structure to summarise), and a PF that only exists because losses are ~0 reads
// as a broken metric.
//
// A LOW SAMPLE NO LONGER HIDES THE NUMBER (user, 2026-08-24). Both helpers used
// to return '—' under LOW_SAMPLE_TRADES, which on a filtered bot page — long
// only, short only — blanked the two figures exactly when the reader had asked a
// sharper question, and read as missing data rather than as a judgement.
//
// The caveat is not dropped, it MOVES: isLowSample() still marks the trade count
// (⚠ + tooltip in the tables, a line under MetricsRow), so the reader now gets
// the figure AND the warning that the sample is thin, where before they got
// neither. LOW_SAMPLE_TRADES therefore stays the site's threshold — it is simply
// no longer a gate on these two strings.
export function fmtPfDisplay(family: string | null | undefined, totalTrades: number, pf: number): string {
  if (isCarryFamily(family)) return '—'
  // No loss to divide by is an absent denominator, not an infinite figure. Served
  // as « ∞ » next to real PFs until 2026-09-25 (audit P0-5); same dash as carry.
  if (pf >= 999) return '—'
  return frNumber(pf, 2)
}

export function fmtWinRateDisplay(family: string | null | undefined, totalTrades: number, winRate: number): string {
  if (isCarryFamily(family)) return '—'
  return `${frNumber(winRate * 100, 1)}${NARROW_NBSP}%`
}

// A drawdown is painted as a loss only when there is one to show. The tables,
// the fiche metrics, the embed and the social card painted it red whatever the
// value, so « 0.0% » on a funding or grid bot read as danger where the figure
// says nothing happened (audit 2026-09-09, design review §2.1). `max_drawdown`
// is stored as a positive fraction of the peak (queries.ts, stats.ts). The test
// is made on the string the reader sees, so a drawdown that rounds to « 0.0% »
// is not red either: colour and text come from this pair, which is why every
// surface formats the figure through fmtDrawdown.
export function fmtDrawdown(maxDrawdown: number): string {
  return `${frNumber(maxDrawdown * 100, 1)}${NARROW_NBSP}%`
}

export function drawdownIsLoss(maxDrawdown: number): boolean {
  // Read back from the string the reader sees (comma decimal, U+202F groups).
  return Number.parseFloat(fmtDrawdown(maxDrawdown).replace(NARROW_NBSP, '').replace(',', '.')) !== 0
}
