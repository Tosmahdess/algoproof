'use client'

import { useEffect, useState } from 'react'
import { getLatestMiSnapshot } from '@/lib/queries'
import type { MiSnapshot } from '@/lib/types'

const RISK_COLOR: Record<string, string> = {
  GREEN:  '#3fb950',
  YELLOW: '#f6c90e',
  ORANGE: '#ff6b35',
  RED:    '#ff4444',
}

const SENTIMENT_COLOR: Record<string, string> = {
  EXTREME_GREED: '#00d4aa',
  GREED:         '#3fb950',
  NEUTRAL:       '#d2a8ff',
  FEAR:          '#f6c90e',
  EXTREME_FEAR:  '#ff4444',
}

const BIAS_COLOR: Record<string, string> = {
  LONG_ONLY:  '#3fb950',
  SHORT_ONLY: '#ff4444',
  BOTH:       '#d2a8ff',
  BLOCKED:    '#666',
}

// The 'institutional' pillar (DVOL/ETF flows) had its scoring retired server-side on
// 2026-06-26 — institutional_score is always null since. Keep only the 4 live pillars.
const PILLARS: { key: keyof MiSnapshot; label: string; color: string }[] = [
  { key: 'sentiment_score',     label: 'Sentiment',      color: '#ff6b35' },
  { key: 'derivatives_score',   label: 'Dérivés',        color: '#d2a8ff' },
  { key: 'news_score',          label: 'News',           color: '#3fb950' },
  { key: 'macro_score',         label: 'Macro',          color: '#40c4ff' },
]

export default function MiRegimeBadge() {
  const [snap, setSnap] = useState<MiSnapshot | null | undefined>(undefined)

  useEffect(() => {
    getLatestMiSnapshot().then(setSnap)
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

  const riskColor      = RISK_COLOR[snap.regime ?? ''] ?? '#888'
  const sentimentColor = SENTIMENT_COLOR[snap.sentiment_regime ?? ''] ?? '#888'
  const biasColor      = BIAS_COLOR[snap.market_bias ?? ''] ?? '#888'
  const ageMin         = Math.round((Date.now() - new Date(snap.snapshot_at).getTime()) / 60000)

  return (
    <div className="rounded border border-border p-6 space-y-5">

      {/* Row 1 — Risk level + sentiment regime + age */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: riskColor }} />
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: riskColor }}>
            {snap.regime ?? '—'}
          </span>
        </div>
        <span className="text-muted text-xs">·</span>
        <span className="text-xs font-semibold tracking-wide" style={{ color: sentimentColor }}>
          {snap.sentiment_regime ?? '—'}
        </span>
        <span className="text-xs text-muted font-mono">
          score {snap.composite_score?.toFixed(1) ?? '—'}
        </span>
        <span className="ml-auto text-[10px] text-muted">il y a {ageMin} min</span>
      </div>

      {/* Row 2 — Trading status */}
      <p className="text-xs text-muted">
        {snap.is_safe ? '✅ Trading autorisé' : '🔴 Trading bloqué'}
        {snap.is_macro_safe === false && ' — Filtre macro actif'}
      </p>

      {/* Row 3 — 4 pillar scores */}
      <div className="grid grid-cols-4 gap-2 text-xs font-mono">
        {PILLARS.map(p => (
          <div key={p.key} className="text-center">
            <p className="text-[9px] text-muted uppercase tracking-wider leading-tight">{p.label}</p>
            <p className="font-bold mt-1 text-[11px]" style={{ color: p.color }}>
              {snap[p.key] != null ? (snap[p.key] as number).toFixed(1) : '—'}
            </p>
          </div>
        ))}
      </div>

      {/* Row 4 — Directional filter */}
      {snap.market_bias && (
        <div className="border-t border-border pt-3 flex items-center gap-4 flex-wrap text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-muted">Biais</span>
            <span className="font-bold tracking-wide" style={{ color: biasColor }}>
              {snap.market_bias}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted">Tendance</span>
            <span className="font-mono">{snap.trend_regime ?? '—'}</span>
            {snap.btc_vs_ema200_pct != null && (
              <span className={`font-mono text-[10px] ${snap.btc_vs_ema200_pct >= 0 ? 'text-positive' : 'text-negative'}`}>
                ({snap.btc_vs_ema200_pct > 0 ? '+' : ''}{snap.btc_vs_ema200_pct.toFixed(1)}% vs moyenne 200 j)
              </span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2 font-mono text-[10px]">
            <span className={snap.allow_long ? 'text-positive' : 'text-muted line-through'}>Longs</span>
            <span className={snap.allow_short ? 'text-positive' : 'text-muted line-through'}>Shorts</span>
          </div>
        </div>
      )}

    </div>
  )
}
