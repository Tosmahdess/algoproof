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

export const valueColor: Record<Intent, string> = {
  positive: 'text-foreground',
  negative: 'text-negative',
  neutral:  'text-foreground',
}
