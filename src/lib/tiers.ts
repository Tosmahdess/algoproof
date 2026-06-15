// src/lib/tiers.ts
// Cohorte de bots : Live > Promu > Labo. Le headline (P&L mis en avant) agrège Live+Promu ;
// le Labo (R&D) a son propre agrégat. Les bots sans trade sont masqués en public.
import type { BotWithStats } from './types'

export type Tier = 'live' | 'promoted' | 'lab'

export function botTier(bot: { status: string; promoted: boolean }): Tier {
  if (bot.status === 'live') return 'live'
  if (bot.promoted) return 'promoted'
  return 'lab'
}

/** Bots affichables en public : au moins un trade. */
export function visibleBots(bots: BotWithStats[]): BotWithStats[] {
  return bots.filter(b => b.stats.total_trades > 0)
}

export function splitByTier(bots: BotWithStats[]): {
  live: BotWithStats[]; promoted: BotWithStats[]; lab: BotWithStats[]
} {
  const live: BotWithStats[] = [], promoted: BotWithStats[] = [], lab: BotWithStats[] = []
  for (const b of bots) {
    const t = botTier(b)
    if (t === 'live') live.push(b)
    else if (t === 'promoted') promoted.push(b)
    else lab.push(b)
  }
  return { live, promoted, lab }
}

/** Cohorte qui alimente le chiffre headline : Live + Promu. */
export function headlineCohort(bots: BotWithStats[]): BotWithStats[] {
  const { live, promoted } = splitByTier(bots)
  return [...live, ...promoted]
}
