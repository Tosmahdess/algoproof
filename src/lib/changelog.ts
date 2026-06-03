import type { Bot, BotChangelog, ScopeType } from './types'

export const SCOPE_META: Record<ScopeType, { label: string; color: string }> = {
  bot:    { label: 'Bot',          color: '#8b949e' },
  fleet:  { label: 'Flotte',       color: '#818cf8' },
  mi:     { label: 'Intelligence', color: '#39c5cf' },
  wealth: { label: 'Patrimoine',   color: '#f6c90e' },
}

export function botVenue(bot: Bot): string {
  const x = (bot.exchange ?? '').toLowerCase()
  if (x.includes('hyperliquid') || /\bhl\b/.test(x)) return 'hl'
  if (x.includes('binance')) return 'binance'
  if (x.includes('oanda')) return 'oanda'
  if (x.includes('bybit')) return 'bybit'
  return x.replace(/\s+/g, '-')
}

export function fleetEntryAppliesTo(entry: BotChangelog, bot: Bot): boolean {
  if (entry.scope_type !== 'fleet') return false
  const a = entry.applies_to ?? 'all'
  if (a === 'all') return true
  if (a.startsWith('family:')) return bot.family === a.slice(7)
  if (a.startsWith('venue:')) return botVenue(bot) === a.slice(6)
  if (a.startsWith('slug:')) return a.slice(5).split(',').map(s => s.trim()).includes(bot.slug)
  return false
}

export function scopeLabel(entry: BotChangelog): string {
  if (entry.scope_type === 'bot') return entry.bot_slug ?? 'Bot'
  return SCOPE_META[entry.scope_type].label
}
