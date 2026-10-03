// src/components/mdx/Stat.tsx
//
// Highlight a key number with optional change/delta and subtext.
// Designed to be inline-friendly: a row of <Stat>s can fit naturally in prose.
//
// Usage in MDX (single):
//   <Stat label="PF moyen IS" value="1.18" change="−0.39" subtext="vs OOS 0.79" />
//
// Usage in MDX (row):
//   <StatRow>
//     <Stat label="Trades" value="216" />
//     <Stat label="Configs GO_COND" value="5" subtext="sur 135 testées" />
//     <Stat label="OOS holding" value="0/5" change="−100 %" />
//     <Stat label="P&L" value="−77.97 USDT" intent="negative" />
//   </StatRow>

//
// Finitions of the « registre des décisions » redesign (2026-10-03): the row is the
// box (a surface and a full 1 px rule), each figure has its label above it in
// sentence case, 13 px, without tracked capitals or a left border per figure.
// Pinned by tests/components/mdx/encadres.test.tsx.

import type { ReactNode } from 'react'
import { BOX } from './box'
import { detectSign, valueColor, type Intent } from './statColor'

interface StatProps {
  label: string
  value: string | number
  change?: string
  subtext?: string
  intent?: Intent
  trend?: 'up' | 'down' | 'neutral'
}

function detectChangeColor(s: string | undefined): string {
  if (!s) return 'text-muted'
  const trimmed = s.trim()
  if (/^[+]/.test(trimmed)) return 'text-positive'
  if (/^[−–-]/.test(trimmed)) return 'text-negative'
  return 'text-muted'
}

const trendIntent: Record<'up' | 'down' | 'neutral', Intent> = {
  up: 'positive',
  down: 'negative',
  neutral: 'neutral',
}

function resolveValueIntent(
  value: string | number,
  intent: Intent | undefined,
  trend: 'up' | 'down' | 'neutral' | undefined
): Intent {
  if (intent) return intent
  if (trend) return trendIntent[trend]
  return detectSign(String(value))
}

export function Stat({ label, value, change, subtext, intent, trend }: StatProps) {
  const changeColor = detectChangeColor(change)
  const valueIntent = resolveValueIntent(value, intent, trend)
  return (
    <div className="not-prose flex-1 min-w-[140px] py-1">
      <div className="text-xs text-muted mb-1">
        {label}
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span
          className={`tabular-nums text-2xl sm:text-3xl font-semibold ${valueColor[valueIntent]}`}
        >
          {value}
        </span>
        {change && (
          <span className={`tabular-nums text-sm font-medium ${changeColor}`}>
            {change}
          </span>
        )}
      </div>
      {subtext && (
        <div className="text-xs text-muted mt-1">{subtext}</div>
      )}
    </div>
  )
}

interface StatRowProps {
  children: ReactNode
}

export function StatRow({ children }: StatRowProps) {
  return (
    <div className={`${BOX} my-8 flex flex-wrap gap-x-8 gap-y-4`}>
      {children}
    </div>
  )
}
