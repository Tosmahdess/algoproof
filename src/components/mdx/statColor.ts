// src/components/mdx/statColor.ts
//
// Shared intent/sign coloring logic for MDX stat components (Stat, DataCard).
// Keeping this in one place avoids the "value color" rule drifting between
// components that all need to render a number in green/red/neutral.

export type Intent = 'positive' | 'negative' | 'neutral'

export function detectSign(s: string): Intent {
  const trimmed = s.trim()
  if (/^[+]/.test(trimmed)) return 'positive'
  if (/^[−–-]\s*\d/.test(trimmed)) return 'negative'
  return 'neutral'
}

export const intentStyles = {
  positive: { border: 'border-l-positive/60', bg: 'bg-positive/[0.03]' },
  negative: { border: 'border-l-negative/60', bg: 'bg-negative/[0.03]' },
  neutral:  { border: 'border-l-muted/40',    bg: 'bg-card/40' },
}

export const valueColor: Record<Intent, string> = {
  positive: 'text-positive',
  negative: 'text-negative',
  neutral:  'text-foreground',
}
