// "Sur mon capital" simulator: re-express the OBSERVED history of a bot at a
// visitor-chosen capital. Pure linear scaling of what already happened — this is a
// reading aid for past results (a PF or a % drawdown is abstract; "−30 € en février"
// is not), never a projection of future returns. The component wrapping this helper
// carries the educational / non-advice wording.

import type { PerfDaily } from './types'

export interface SimulationResult {
  pnlEur: number
  worstMonthEur: number
  worstMonthLabel: string | null
  maxDrawdownEur: number
  firstDate: string
  lastDate: string
}

export function simulateOnCapital(
  perf: PerfDaily[],
  startCapital: number,
  userCapital: number,
): SimulationResult | null {
  if (perf.length === 0 || startCapital <= 0 || userCapital <= 0) return null

  const scale = userCapital / startCapital
  const sorted = [...perf].sort((a, b) => a.date.localeCompare(b.date))

  const last = sorted[sorted.length - 1]
  const pnlEur = (last.capital - startCapital) * scale

  // Worst calendar month (sum of pnl_day), scaled.
  const byMonth = new Map<string, number>()
  for (const p of sorted) {
    const month = p.date.slice(0, 7)
    byMonth.set(month, (byMonth.get(month) ?? 0) + p.pnl_day)
  }
  let worstMonthEur = 0
  let worstMonthLabel: string | null = null
  for (const [month, pnl] of byMonth) {
    if (pnl < worstMonthEur / scale) {
      worstMonthEur = pnl * scale
      worstMonthLabel = month
    }
  }

  // Max peak-to-trough drawdown in €, scaled.
  let peak = sorted[0].capital
  let maxDdEur = 0
  for (const p of sorted) {
    if (p.capital > peak) peak = p.capital
    const ddEur = (p.capital - peak) * scale
    if (ddEur < maxDdEur) maxDdEur = ddEur
  }

  return {
    pnlEur,
    worstMonthEur,
    worstMonthLabel,
    maxDrawdownEur: maxDdEur,
    firstDate: sorted[0].date,
    lastDate: last.date,
  }
}
