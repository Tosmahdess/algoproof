// src/lib/library.ts
//
// The library (chantier bibliotheque, lot 2, D079 / D083): every survivor of the
// engine, launched or not, grouped by IDEA (engine base x timeframe). A card per
// idea, its variants in a table.
//
// It reads through two views of migration 061, never through getBots: the site
// keeps excluding 'backtest' everywhere it did (PUBLIC_STATUS_EXCLUSION), and the
// fleet pages must not start loading 2 154 never-launched rows. Nothing here can
// print a setting value: `bots` holds filter NAMES only, and the selection-period
// PF / trade count are already public per survivor through the lab's dossier.

import { supabase } from './supabase'
import { paginateAll } from './paginate'

export interface LibraryIdea {
  idea_key: string
  base: string
  tf: string
  family: string
  n_variants: number
  n_backtest: number
  n_awaiting: number
  n_trailing: number
  n_not_surviving: number
  n_running: number
  n_live: number
  n_paper: number
  n_stopped: number
  n_sim_up: number
  n_sim_down: number
  n_sim_young: number
  pf_q1: number | null
  pf_median: number | null
  pf_q3: number | null
  n_pf: number
  last_found_at: string | null
}

export interface LibraryVariant {
  slug: string
  name: string
  status: string
  idea_key: string
  idea_rank: number | null
  wait_reason: string | null
  filter_keys: string[] | null
  mtf_caveat: boolean
  survivor_id: string | null
  assets: string[] | null
  found_at: string | null
  paper_since: string | null
  pf_backtest: number | null
  n_trades_backtest: number | null
  sim_trades: number
  sim_pnl: number
}

const NUMERIC: (keyof LibraryIdea)[] = [
  'n_variants', 'n_backtest', 'n_awaiting', 'n_trailing', 'n_not_surviving', 'n_running',
  'n_live', 'n_paper', 'n_stopped', 'n_sim_up', 'n_sim_down', 'n_sim_young', 'n_pf',
]

// PostgREST returns bigint counts as strings; every count is a number past here.
function toIdea(row: Record<string, unknown>): LibraryIdea {
  const out = { ...row } as Record<string, unknown>
  for (const k of NUMERIC) out[k] = Number(row[k] ?? 0)
  for (const k of ['pf_q1', 'pf_median', 'pf_q3']) out[k] = row[k] == null ? null : Number(row[k])
  return out as unknown as LibraryIdea
}

/** Every idea, one row each (75 on 2026-10-01). */
export async function getLibraryIdeas(): Promise<LibraryIdea[]> {
  const rows = await paginateAll(async (from, to) => {
    const { data, error } = await supabase.from('library_ideas').select('*')
      .order('idea_key').range(from, to)
    if (error) throw new Error(error.message)
    return data ?? []
  })
  return rows.map(toIdea)
}

const VARIANT_COLUMNS = 'slug,name,status,idea_key,idea_rank,wait_reason,filter_keys,mtf_caveat,' +
  'survivor_id,assets,found_at,paper_since,pf_backtest,n_trades_backtest,sim_trades,sim_pnl'

/** Every variant of one idea (166 at most on 2026-10-01), running ones first. */
export async function getIdeaVariants(ideaKey: string): Promise<LibraryVariant[]> {
  const rows = await paginateAll(async (from, to) => {
    const { data, error } = await supabase.from('library_variants').select(VARIANT_COLUMNS)
      .eq('idea_key', ideaKey).order('slug').range(from, to)
    if (error) throw new Error(error.message)
    return (data ?? []) as unknown as LibraryVariant[]
  })
  return sortVariants(rows
    .map(v => ({ ...v, sim_trades: Number(v.sim_trades), sim_pnl: Number(v.sim_pnl),
      pf_backtest: v.pf_backtest == null ? null : Number(v.pf_backtest) })))
}

const STATE_ORDER: Record<string, number> = { live: 0, paper: 1, archived: 2, backtest: 3 }

/** The « n° k » of a variant: its idea_rank, or, for the variants launched before the
 *  rank existed (idea_rank null), the number their name already carries. Given once at
 *  publication and never recomputed (migration 060): an identifier, not a ranking. */
export function variantNumber(v: { idea_rank: number | null; name: string }): number | null {
  if (v.idea_rank != null) return v.idea_rank
  const m = v.name.match(/n° (\d+)\s*$/)
  return m ? Number(m[1]) : null
}

/** The register's order, said above it on the idea page: by state (real money,
 *  simulation, stopped, backtest only), then by number. Never by a result. */
export function sortVariants<T extends LibraryVariant>(rows: T[]): T[] {
  const state = (v: LibraryVariant) => STATE_ORDER[v.status] ?? 9
  const num = (v: LibraryVariant) => variantNumber(v) ?? Number.MAX_SAFE_INTEGER
  return [...rows].sort((a, b) => state(a) - state(b) || num(a) - num(b) || a.slug.localeCompare(b.slug))
}

/** Closed simulated trades under which a variant is "too young" to be called above or
 *  below zero. 30, the public sales criterion's count -- deliberately NOT the judge's
 *  classified per-window floor, which a visitor could otherwise read off the table.
 *  The SQL view library_ideas (migration 062) uses the same number. */
export const SIM_MIN_TRADES = 30

// ---------------------------------------------------------------- pure helpers

/** 'ZScoreReversal|H4' -> 'zscorereversal-h4' (the idea page URL). */
export function ideaSlug(ideaKey: string): string {
  const [base, tf] = ideaKey.split('|')
  return `${base.toLowerCase()}-${(tf ?? '').toLowerCase()}`
}

export function ideaKeyFromSlug(slug: string, keys: string[]): string | null {
  return keys.find(k => ideaSlug(k) === slug) ?? null
}

const WAIT_REASON: Record<string, string> = {
  awaiting_validation: 'En attente de lancement',
  trailing_unsupported: 'Stop suiveur pas encore pris en charge',
  executor_unsupported: 'Pas encore prise en charge par mes bots',
  not_surviving: 'Ne survit plus à la dernière génération',
}

export function waitReasonLabel(code: string | null): string {
  return code ? (WAIT_REASON[code] ?? code) : ''
}

/** The state of a variant in words. A survivor never launched is never "paper". */
export function variantState(v: { status: string }): string {
  switch (v.status) {
    case 'live': return 'Argent réel'
    case 'paper': return 'En simulation'
    case 'archived': return 'Arrêtée'
    case 'backtest': return 'Backtest seul'
    default: return v.status
  }
}

// Filter names in French, copied from the engine's publication copy
// (backtests_massive/publish/filter_catalog.py COPY_FR, labels only, 2026-10-01).
// Names only: the values are the lab's.
const FILTER_LABEL: Record<string, string> = {
  mtf_align: 'Accord des unités de temps supérieures',
  ma_stack: 'Moyennes mobiles empilées',
  supertrend_side: 'Côté du Supertrend',
  ichimoku_cloud: 'Nuage Ichimoku',
  vwap_dir: 'Côté du VWAP',
  adx_min: 'Force de tendance minimale',
  ema_slope: 'Pente de la moyenne longue',
  rsi_gate: 'Accord du RSI',
  macd_hist: 'Histogramme MACD',
  mfi_gate: 'Accord du MFI',
  atr_ratio: 'Volatilité en expansion ou comprimée',
  squeeze_release: 'Compression de volatilité',
  volume_confirm: 'Confirmation par le volume',
  obv_slope: "Pente de l'OBV",
  buffer_zone: 'Marge de franchissement',
  time_persist: 'Persistance du signal',
  min_range: 'Amplitude minimale',
  dist_ma_max: 'Distance maximale à la moyenne',
  session: 'Heures de marché',
  htf_bias: 'Tendance du daily',
  rvol: 'Volume relatif',
  regime_gate: 'Régime de marché',
  retest: 'Retour sur le niveau franchi',
  ema_cross_side: "État d'un croisement de moyennes",
  donchian_pos: 'Position dans le canal de Donchian',
  keltner_pos: 'Position hors du canal de Keltner',
  ha_color: 'Couleur de la bougie Heikin-Ashi',
  reversal_bar: 'Bougie de rejet',
  hurst: 'Régime de persistance',
  compression_bar: 'Bougie de compression',
  atr_remaining: 'Amplitude restante dans la journée',
}

export function filterLabel(key: string): string {
  return FILTER_LABEL[key] ?? key
}

export function simSplit(i: LibraryIdea): { up: number; down: number; young: number; total: number } {
  return { up: i.n_sim_up, down: i.n_sim_down, young: i.n_sim_young,
    total: i.n_sim_up + i.n_sim_down + i.n_sim_young }
}

/** What the simulation says so far for an idea, in words, only the parts that exist.
 *  Null when no variant runs: the register then prints « — », uncoloured. */
export function simLine(i: LibraryIdea): string | null {
  const s = simSplit(i)
  if (s.total === 0) return null
  const parts = [
    s.up > 0 ? `${s.up} au-dessus de zéro` : null,
    s.down > 0 ? `${s.down} à zéro ou en dessous` : null,
    s.young > 0 ? `${s.young} ${s.young > 1 ? 'trop jeunes' : 'trop jeune'} pour conclure` : null,
  ]
  return parts.filter(Boolean).join(', ')
}

/** 'running' puts first the ideas with the most launched variants: a count of what
 *  runs, not a ranking on its result (D085 keeps « Plus de variantes » as the default
 *  until a ranking on the simulation is ripe). */
export type IdeaSort = 'recent' | 'size' | 'az' | 'running'

export function sortIdeas<T extends LibraryIdea>(ideas: T[], sort: IdeaSort): T[] {
  const az = (a: LibraryIdea, b: LibraryIdea) => a.base.localeCompare(b.base) || a.tf.localeCompare(b.tf)
  const size = (a: LibraryIdea, b: LibraryIdea) => b.n_variants - a.n_variants || az(a, b)
  const copy = [...ideas]
  if (sort === 'az') return copy.sort(az)
  if (sort === 'size') return copy.sort(size)
  if (sort === 'running') return copy.sort((a, b) => b.n_running - a.n_running || size(a, b))
  return copy.sort((a, b) => (b.last_found_at ?? '').localeCompare(a.last_found_at ?? '') || az(a, b))
}
