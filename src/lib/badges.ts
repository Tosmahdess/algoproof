import type { BotStats, Badge } from './types'
import { DEFAULT_PAPER_CAPITAL } from './display'

export function computeBadges(stats: BotStats, startCapital: number = DEFAULT_PAPER_CAPITAL): Badge[] {
  const badges: Badge[] = []

  // computeBadges only receives BotStats, not the bot's status/mode, so it
  // cannot tell a real-money bot from a paper one here. Most bots on this
  // site are simulated (see house rule: never claim "live" for a paper P&L),
  // so these labels stay mode-neutral ("trades") rather than implying real
  // money traded. Gate on status upstream if a live-specific badge is ever needed.
  if (stats.total_trades >= 100) {
    badges.push({ emoji: '✅', label: '100 trades', color: 'var(--positive)' })
  } else if (stats.total_trades >= 50) {
    badges.push({ emoji: '✅', label: '50 trades', color: 'var(--positive)' })
  }

  if (stats.profit_factor >= 1.5) {
    badges.push({ emoji: '🏆', label: 'PF ≥ 1.5', color: '#58a6ff' })
  }

  if (stats.win_rate >= 0.60) {
    badges.push({ emoji: '📈', label: 'WR ≥ 60%', color: 'var(--severe)' })
  }

  if (stats.total_trades > 0 && stats.max_drawdown <= 0.05) {
    badges.push({ emoji: '🛡️', label: 'DD ≤ 5%', color: 'var(--accent)' })
  }

  if (stats.latest_capital > startCapital) {
    badges.push({ emoji: '🔥', label: 'En positif', color: 'var(--severe)' })
  }

  return badges
}
