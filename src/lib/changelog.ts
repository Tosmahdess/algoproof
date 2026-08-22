import type { ScopeType } from './types'

// Reduced to SCOPE_META on 2026-08-08. `fleetEntryAppliesTo`, `botVenue` and `scopeLabel` all
// became unreachable when the public /journal page and the per-bot « Historique » tab were
// removed: fleet targeting (`family:x` / `venue:x` / `slug:a,b`) only ever existed to decide
// whether a fleet-wide entry belonged on a given bot's tab, and there is no longer a bot tab.
// SCOPE_META survives because ScopeBadge still colours the MI entries on /intelligence.
// Restoring per-bot changelogs means restoring all three together — they are one mechanism.
export const SCOPE_META: Record<ScopeType, { label: string; color: string }> = {
  bot:    { label: 'Bot',          color: 'var(--muted)' },
  fleet:  { label: 'Flotte',       color: 'var(--accent)' },
  mi:     { label: 'Intelligence', color: '#39c5cf' },
  wealth: { label: 'Patrimoine',   color: 'var(--warning)' },
}
