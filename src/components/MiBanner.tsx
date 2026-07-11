'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { MiSnapshot } from '@/lib/types'

const REGIME_COLOR: Record<string, string> = {
  GREEN:  '#3fb950',
  YELLOW: '#f6c90e',
  ORANGE: '#ff6b35',
  RED:    '#ff4444',
}

const REGIME_FR: Record<string, string> = {
  GREEN:  'NEUTRE — SAFE',
  YELLOW: 'ATTENTION',
  ORANGE: 'STRESS',
  RED:    'DANGER',
}

export default function MiBanner() {
  const [snap, setSnap] = useState<MiSnapshot | null | undefined>(undefined)

  useEffect(() => {
    fetch('/api/mi').then(r => r.json()).then(setSnap)
  }, [])

  if (snap === undefined) {
    return (
      <div className="rounded border border-border p-4 flex items-center gap-3 animate-pulse">
        <div className="h-3 w-3 rounded-full bg-border" />
        <span className="text-xs text-muted">Chargement du régime MI...</span>
      </div>
    )
  }

  if (!snap) {
    return (
      <div className="rounded border border-border p-4">
        <span className="text-xs text-muted">Données MI non disponibles</span>
      </div>
    )
  }

  const color  = REGIME_COLOR[snap.regime ?? ''] ?? '#888'
  const label  = REGIME_FR[snap.regime ?? ''] ?? snap.regime ?? '—'
  const ageMin = Math.round((Date.now() - new Date(snap.snapshot_at).getTime()) / 60000)

  const PILLARS = [
    { key: 'sentiment_score'   as keyof MiSnapshot, label: 'Sentiment',   color: '#ff6b35', weight: '30%' },
    { key: 'derivatives_score' as keyof MiSnapshot, label: 'Dérivés',     color: '#d2a8ff', weight: '40%' },
    { key: 'news_score'        as keyof MiSnapshot, label: 'Actualités',  color: '#3fb950', weight: '5%' },
    { key: 'macro_score'       as keyof MiSnapshot, label: 'Macro',       color: '#40c4ff', weight: '25%' },
  ]

  return (
    <div>
      <div className="rounded border overflow-hidden" style={{ borderColor: color + '40' }}>
        {/* Header bar */}
        <div className="px-5 py-3 flex items-center gap-4" style={{ background: color + '12' }}>
          <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: color }} />
          <div className="flex-1 flex items-center gap-4 flex-wrap">
            <span className="text-sm font-bold tracking-widest uppercase" style={{ color }}>
              {label}
            </span>
            <span className="font-mono text-xs text-muted">
              Score composite : {snap.composite_score?.toFixed(2) ?? '—'}
            </span>
            <span className="text-xs text-muted">
              {snap.is_safe ? '✅ Trading autorisé' : '🔴 Trading bloqué'}
            </span>
          </div>
          <span className="text-[10px] text-muted flex-shrink-0">màj il y a {ageMin} min</span>
        </div>

        {/* Pillar scores */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border">
          {PILLARS.map(p => {
            const val = snap[p.key] as number | null
            return (
              <div key={p.key} className="px-4 py-3 text-center">
                <p className="text-[10px] text-muted uppercase tracking-wider mb-1">
                  {p.label} <span className="opacity-50">{p.weight}</span>
                </p>
                <p className="font-mono font-bold text-base" style={{ color: p.color }}>
                  {val != null ? val.toFixed(1) : '—'}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {!snap.is_safe && (
        <p className="text-xs text-muted mt-2">
          Le gardien a coupé les nouvelles entrées : marché jugé défavorable. C&apos;est le comportement prévu, pas une panne.{' '}
          <Link href="/intelligence" className="text-accent hover:underline">Comment il décide →</Link>
        </p>
      )}
    </div>
  )
}
