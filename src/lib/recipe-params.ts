// src/lib/recipe-params.ts
//
// A wave bot's exact recipe, as stored in bot_recipes (members only, read by
// /api/bot/[slug]/recipe), mapped onto the BotParams shape the hand-written
// fiches already use. Pure: no data lives here, so the client component that
// imports it ships no recipe in the bundle.
import type { BotParams, ParamGroup } from './bot-params'

type Scalar = number | string
export interface BotRecipe {
  tf?: string
  params?: Record<string, Scalar>
  filters?: Record<string, Record<string, Scalar>>
  exit?: ({ atr_mult?: number; rr?: number; trail_mult?: number } & Record<string, number>) | null
  assets?: string[]
  provenance?: { dataset?: string; engine_fingerprint?: string }
}

// Setting-free French names, copied from algolab web/lib/engine-vocab.ts
// (FILTER_NAME_FR). A key missing here renders under its raw name: an
// unknown filter is shown, never dropped.
const FILTER_NAME_FR: Record<string, string> = {
  atr_ratio: 'volatilité relative',
  rvol: 'volume anormal',
  macd_hist: 'élan du MACD',
  ma_stack: 'moyennes empilées',
  obv_slope: 'volume cumulé (OBV)',
  mtf_align: 'accord des horizons supérieurs',
  session: 'plage horaire',
  dist_ma_max: 'distance à la moyenne',
  ema_slope: 'pente de la moyenne longue',
  adx_min: 'force de tendance (ADX)',
  ichimoku_cloud: 'nuage Ichimoku',
  min_range: 'amplitude minimale',
  supertrend_side: 'côté du SuperTrend',
  mfi_gate: 'flux monétaire (MFI)',
  rsi_gate: 'zone du RSI',
  volume_confirm: 'confirmation par le volume',
  buffer_zone: 'marge de franchissement',
  vwap_dir: 'côté du VWAP',
  ema_cross_side: 'côté du croisement de moyennes',
  ha_color: 'couleur Heikin-Ashi',
  hurst: 'régime de persistance',
  donchian_pos: 'position dans le canal de Donchian',
  squeeze_release: 'sortie de compression (squeeze)',
}

// Signal parameter names found in the wave-1 recipes (2026-09-24). Same rule:
// a name missing here renders raw.
const PARAM_NAME_FR: Record<string, string> = {
  period: 'période',
  multiplier: 'multiplicateur',
  mult: 'multiplicateur',
  ema_fast: 'EMA rapide',
  ema_slow: 'EMA lente',
  fast_period: 'période rapide',
  slow_period: 'période lente',
  consec: 'bougies consécutives',
  range_minutes: 'durée du range (min)',
  session_anchor: "session d'ancrage",
}

const kv = (o: Record<string, Scalar>) =>
  Object.entries(o).map(([k, v]) => `${k} ${v}`).join(' · ')

const ticker = (a: string) => a.split('/')[0]

export function toBotParams(r: BotRecipe): BotParams {
  const signal: ParamGroup['items'] = Object.entries(r.params ?? {}).map(([k, v]) => ({
    label: PARAM_NAME_FR[k] ?? k,
    value: String(v),
  }))
  if (r.tf) signal.push({ label: 'Unité de temps', value: r.tf })
  if (r.assets?.length) {
    signal.push({ label: 'Actifs', value: String(r.assets.length), note: r.assets.map(ticker).join(', ') })
  }

  const filterEntries = Object.entries(r.filters ?? {})
  const filters: ParamGroup['items'] = filterEntries.length
    ? filterEntries.map(([k, v]) => ({ label: FILTER_NAME_FR[k] ?? k, value: kv(v ?? {}) }))
    : [{ label: 'Filtres', value: 'aucun' }]

  const exit: ParamGroup['items'] = []
  if (!r.exit) {
    exit.push({ label: 'Sortie', value: 'par défaut du moteur' })
  } else {
    if (r.exit.atr_mult != null) exit.push({ label: 'Stop loss', value: `ATR × ${r.exit.atr_mult}` })
    if (r.exit.rr != null) exit.push({ label: 'R:R minimal', value: `1 : ${r.exit.rr}` })
    if (r.exit.trail_mult != null) exit.push({ label: 'Stop suiveur', value: `ATR × ${r.exit.trail_mult}` })
    // Any other exit key (atr_period is allowed by the engine) renders raw, never dropped.
    for (const [k, v] of Object.entries(r.exit)) {
      if (!['atr_mult', 'rr', 'trail_mult'].includes(k)) exit.push({ label: k, value: String(v) })
    }
  }

  const groups: ParamGroup[] = [
    { title: 'Signal', items: signal },
    { title: 'Filtres', items: filters },
    { title: 'Sortie', items: exit },
  ]
  const p = r.provenance
  if (p?.dataset) {
    groups.push({
      title: 'Provenance',
      items: [{ label: 'Génération', value: p.dataset, note: p.engine_fingerprint ? `moteur ${p.engine_fingerprint}` : undefined }],
    })
  }
  return { groups }
}
