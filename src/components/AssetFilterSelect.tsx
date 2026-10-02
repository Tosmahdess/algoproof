// src/components/AssetFilterSelect.tsx
'use client'

import { useId } from 'react'
import type { AssetOption } from '@/lib/asset'

interface Props {
  options: AssetOption[]            // base-symbol options, without the 'all' entry
  value: string                     // 'all' | base symbol
  onChange: (v: string) => void
  label?: string
}

/**
 * Asset filter dropdown. Auto-hides when there is at most one asset to choose from.
 *
 * Refonte lot 3 (2026-10-02, audit 2026-10 constat 19): the select has a real <label>,
 * so a screen reader names it; 44 px high with a control contour like the pills.
 */
export default function AssetFilterSelect({ options, value, onChange, label = 'Actif' }: Props) {
  const id = useId()
  if (options.length <= 1) return null
  return (
    <div>
      <label htmlFor={id} className="block text-xs text-muted mb-1">{label}</label>
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-bg border border-border-strong rounded min-h-11 px-2.5 text-sm text-foreground focus:border-accent"
      >
        <option value="all">Tous les actifs</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
