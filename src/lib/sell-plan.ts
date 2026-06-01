export interface SellPlanInput {
  tp1_pct: number | null
  tp1_sell_pct: number | null
  tp2_pct: number | null
  tp2_sell_pct: number | null
  residual_pct: number | null
}

function palier(gain: number | null, sell: number | null): string | null {
  if (gain == null) return null
  return sell == null ? `+${gain}%` : `+${gain}% → vendre ${sell}%`
}

export function sellPlanLines(p: SellPlanInput): string[] {
  const lines: string[] = []
  const l1 = palier(p.tp1_pct, p.tp1_sell_pct)
  const l2 = palier(p.tp2_pct, p.tp2_sell_pct)
  if (l1) lines.push(l1)
  if (l2) lines.push(l2)
  if (p.residual_pct != null && p.residual_pct > 0) lines.push(`garder ${p.residual_pct}% (long terme)`)
  return lines
}
