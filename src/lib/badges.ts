import type { BotStats, Badge } from './types'
import { PAPER_CAPITAL } from './display'

export function computeBadges(stats: BotStats): Badge[] {
  const badges: Badge[] = []

  if (stats.total_trades >= 100) {
    badges.push({ emoji: '✅', label: '100 trades live', color: '#3fb950' })
  } else if (stats.total_trades >= 50) {
    badges.push({ emoji: '✅', label: '50 trades live', color: '#3fb950' })
  }

  if (stats.profit_factor >= 1.5) {
    badges.push({ emoji: '🏆', label: 'PF ≥ 1.5', color: '#58a6ff' })
  }

  if (stats.win_rate >= 0.60) {
    badges.push({ emoji: '📈', label: 'WR ≥ 60%', color: '#ff6b35' })
  }

  if (stats.total_trades > 0 && stats.max_drawdown <= 0.05) {
    badges.push({ emoji: '🛡️', label: 'DD ≤ 5%', color: '#d2a8ff' })
  }

  if (stats.latest_capital > PAPER_CAPITAL) {
    badges.push({ emoji: '🔥', label: 'En positif', color: '#ff6b35' })
  }

  return badges
}
