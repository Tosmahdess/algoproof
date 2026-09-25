'use client'

import { useEffect, useState } from 'react'
import { getLatestMiSnapshot } from '@/lib/queries'
import type { MiSnapshot } from '@/lib/types'
import { regimeFr, biasFr, trendFr } from '@/lib/regime-labels'
import { frNumber, fmtPct, MINUS } from '@/lib/display'

const RISK_COLOR: Record<string, string> = {
  GREEN:  'var(--positive)',
  YELLOW: 'var(--warning)',
  ORANGE: 'var(--severe)',
  RED:    'var(--negative)',
}

const BIAS_COLOR: Record<string, string> = {
  LONG_ONLY:  'var(--positive)',
  SHORT_ONLY: 'var(--negative)',
  BOTH:       'var(--muted)',
  BLOCKED:    '#666',
}

// The 'institutional' pillar (DVOL/ETF flows) had its scoring retired server-side on
// 2026-06-26 — institutional_score is always null since. Keep only the 4 live pillars.
// Pillar colors are a 4-way categorical set (all 4 render simultaneously below), not a
// semantic ramp — sentiment gets the new `severe` token, news reuses `positive`, and
// derivatives/macro both map to `accent` per the design-unification color mapping
// (2026-08-22): the two least-frequent orphan hexes share the closest existing token.
const PILLARS: { key: keyof MiSnapshot; label: string; color: string }[] = [
  { key: 'sentiment_score',     label: 'Sentiment',      color: 'var(--severe)' },
  { key: 'derivatives_score',   label: 'Dérivés',        color: 'var(--accent)' },
  { key: 'news_score',          label: 'Actualités',     color: 'var(--positive)' },
  { key: 'macro_score',         label: 'Macro',          color: 'var(--pillar-macro)' },
]

// One state, one word (design audit §4): the lexicon word, capitalised, as the first
// thing read. The sentiment enum that used to sit beside it is a pillar, not a state:
// its score is in the row below.
function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// « 12,1 » and « −6,2 » (spec 5.4): the real minus sign, no plus sign, one decimal.
function score1(n: number): string {
  return n < 0 && Number(Math.abs(n).toFixed(1)) !== 0 ? `${MINUS}${frNumber(n, 1)}` : frNumber(n, 1)
}

function freshness(snapshotAt: string): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(snapshotAt).getTime()) / 60000))
  return min < 120 ? `il y a ${min} min` : `il y a ${Math.round(min / 60)} h`
}

// What the state changes for the bots today, from is_safe alone (spec 5.4, lot 7).
// The substance of the weather is frozen: this is the gate's own answer, worded for
// a reader, not a new rule.
function todayForBots(snap: MiSnapshot): string {
  if (snap.is_safe) return 'Les bots entrent normalement, taille de position normale.'
  return snap.is_macro_safe === false
    ? 'Les bots n’entrent pas : entrées bloquées, filtre macro actif.'
    : 'Les bots n’entrent pas : entrées bloquées tant que ça dure.'
}

export default function MiRegimeBadge() {
  const [snap, setSnap] = useState<MiSnapshot | null | undefined>(undefined)

  useEffect(() => {
    getLatestMiSnapshot().then(setSnap)
  }, [])

  if (snap === undefined) {
    // A skeleton of the final height, never a « Chargement… » sentence in a first
    // screen (spec §3.4).
    return (
      <div
        data-testid="mi-regime-skeleton"
        aria-busy="true"
        className="rounded border border-border p-6 space-y-5 animate-pulse"
      >
        <div className="h-5 w-40 rounded bg-card-2" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {PILLARS.map(p => <div key={p.key} className="h-10 rounded bg-card-2" />)}
        </div>
        <div className="h-4 w-72 max-w-full rounded bg-card-2" />
      </div>
    )
  }

  if (snap === null) {
    return (
      <div className="rounded border border-border p-6 text-center">
        <p className="text-xs text-muted">Pas encore de données : synchronisation VPS toutes les heures.</p>
      </div>
    )
  }

  const riskColor = RISK_COLOR[snap.regime ?? ''] ?? '#888'
  const biasColor = BIAS_COLOR[snap.market_bias ?? ''] ?? '#888'

  return (
    <div className="rounded border border-border p-6 space-y-5">

      {/* Row 1 — the state, one word, its score, its freshness */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: riskColor }} />
          <span className="text-xl font-semibold" style={{ color: riskColor }}>
            {capitalise(regimeFr(snap.regime))}
          </span>
        </div>
        <span className="text-muted text-xs">·</span>
        <span className="text-sm text-muted font-mono">
          score {snap.composite_score != null ? score1(snap.composite_score) : '—'}
        </span>
        <span className="ml-auto text-xs text-muted">{freshness(snap.snapshot_at)}</span>
      </div>

      {/* Row 2 — 4 pillar scores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono">
        {PILLARS.map(p => (
          <div key={p.key} className="text-center">
            <p className="text-xs text-muted leading-tight">{p.label}</p>
            <p className="font-semibold mt-1 text-sm" style={{ color: p.color }}>
              {snap[p.key] != null ? score1(snap[p.key] as number) : '—'}
            </p>
          </div>
        ))}
      </div>

      {/* Row 3 — what it changes for the bots today */}
      <p className="text-sm leading-relaxed">
        <span className="text-muted">Ce que ça change pour mes bots aujourd’hui : </span>
        {todayForBots(snap)}
      </p>

      {/* Row 4 — Directional filter */}
      {snap.market_bias && (
        <div className="border-t border-border pt-3 flex items-center gap-4 flex-wrap text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-muted">Biais</span>
            <span className="font-semibold" style={{ color: biasColor }}>
              {biasFr(snap.market_bias)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted">Tendance</span>
            <span className="font-mono">{trendFr(snap.trend_regime)}</span>
            {snap.btc_vs_ema200_pct != null && (
              <span className={`font-mono text-xs ${snap.btc_vs_ema200_pct >= 0 ? 'text-positive' : 'text-negative'}`}>
                ({fmtPct(snap.btc_vs_ema200_pct, 1)} vs moyenne {frNumber(200, 0)} j)
              </span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2 font-mono text-xs">
            <span className={snap.allow_long ? 'text-positive' : 'text-muted line-through'}>Longs</span>
            <span className={snap.allow_short ? 'text-positive' : 'text-muted line-through'}>Shorts</span>
          </div>
        </div>
      )}

    </div>
  )
}
