'use client'

import { useEffect, useState } from 'react'
import type { MiSnapshot } from '@/lib/types'

const REGIME_COLOR: Record<string, string> = {
  GREEN:  '#3fb950',
  YELLOW: '#f6c90e',
  ORANGE: '#ff6b35',
  RED:    '#ff4444',
}

const PILLARS: { key: keyof MiSnapshot; label: string; color: string }[] = [
  { key: 'sentiment_score',   label: 'Sentiment',   color: '#ff6b35' },
  { key: 'derivatives_score', label: 'Derivatives', color: '#d2a8ff' },
  { key: 'news_score',        label: 'News',        color: '#3fb950' },
  { key: 'macro_score',       label: 'Macro',       color: '#40c4ff' },
]

export default function MiRegimeBadge() {
  const [snap, setSnap] = useState<MiSnapshot | null | undefined>(undefined)

  useEffect(() => {
    fetch('/api/mi').then(r => r.json()).then(setSnap)
  }, [])

  if (snap === undefined) {
    return (
      <div className="rounded border border-border p-6 flex items-center gap-4">
        <div className="h-3 w-3 rounded-full bg-positive animate-pulse flex-shrink-0" />
        <div>
          <p className="text-xs font-semibold">Régime actuel</p>
          <p className="text-xs text-muted mt-0.5">Chargement...</p>
        </div>
      </div>
    )
  }

  if (snap === null) {
    return (
      <div className="rounded border border-border p-6 text-center">
        <p className="text-xs text-muted">Pas encore de données — synchronisation VPS toutes les heures.</p>
      </div>
    )
  }

  const color = REGIME_COLOR[snap.regime ?? ''] ?? '#888'
  const ageMin = Math.round((Date.now() - new Date(snap.snapshot_at).getTime()) / 60000)

  return (
    <div className="rounded border border-border p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="text-xs font-bold tracking-widest uppercase" style={{ color }}>
          {snap.regime ?? '—'}
        </span>
        <span className="text-xs text-muted font-mono">
          score {snap.composite_score?.toFixed(1) ?? '—'}
        </span>
        <span className="ml-auto text-[10px] text-muted">il y a {ageMin} min</span>
      </div>

      <p className="text-xs text-muted">
        {snap.is_safe ? '✅ Trading autorisé' : '🔴 Trading bloqué'}
        {snap.is_macro_safe === false && ' — Filtre macro actif'}
      </p>

      <div className="grid grid-cols-4 gap-3 text-xs font-mono">
        {PILLARS.map(p => (
          <div key={p.key} className="text-center">
            <p className="text-[10px] text-muted uppercase tracking-wider">{p.label}</p>
            <p className="font-bold mt-1" style={{ color: p.color }}>
              {snap[p.key] != null ? (snap[p.key] as number).toFixed(1) : '—'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
