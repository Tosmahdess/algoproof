// src/components/AssetFilterSelect.tsx
'use client'

import type { AssetOption } from '@/lib/asset'

interface Props {
  options: AssetOption[]            // base-symbol options, without the 'all' entry
  value: string                     // 'all' | base symbol
  onChange: (v: string) => void
  label?: string
}

/**
 * Asset filter dropdown, styled to match PerformanceClient's date inputs.
 * Auto-hides when there is at most one asset to choose from.
 */
export default function AssetFilterSelect({ options, value, onChange, label = 'Actif' }: Props) {
  if (options.length <= 1) return null
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.15em] text-muted font-semibold mb-1.5">{label}</div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-card border border-border rounded-md px-2.5 py-1 text-xs text-foreground focus:border-accent focus:outline-none"
      >
        <option value="all">Tous les actifs</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
