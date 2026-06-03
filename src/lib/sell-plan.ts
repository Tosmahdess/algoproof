export type ExitState = 'hold' | 'intact' | 'broken'

export interface SellPlanInput {
  tp1_pct: number | null
  tp1_sell_pct: number | null
  tp2_pct: number | null
  tp2_sell_pct: number | null
  residual_pct: number | null
  exit_state?: ExitState | null
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

  // hold_forever names keep their residual long-term; tactical names exit it when
  // the long trend breaks. exit_state is authoritative when present; otherwise we
  // fall back to the residual_pct sign (legacy rows, before exit_state backfill).
  const isHold = p.exit_state === 'hold' || (p.exit_state == null && (p.residual_pct ?? 0) > 0)

  if (isHold) {
    if ((p.residual_pct ?? 0) > 0) lines.push(`garder ${p.residual_pct}% (long terme)`)
    return lines
  }

  // Tactical: the chunk neither sold at the paliers nor kept is exited on a trend
  // break. The line states the rule (intact) or the action (broken) — never the
  // old circular "à la sortie".
  const sellsKnown = p.tp1_sell_pct != null || p.tp2_sell_pct != null
  const remainder = 100 - (p.tp1_sell_pct ?? 0) - (p.tp2_sell_pct ?? 0)
  if (sellsKnown && remainder > 0) {
    if (p.exit_state === 'broken') {
      lines.push(`⚠️ tendance cassée : solder le reste (${remainder}%)`)
    } else {
      lines.push(`solder le reste (${remainder}%) si le cours casse sa tendance longue (clôture sous la MM50 orientée à la baisse)`)
    }
  }

  return lines
}
