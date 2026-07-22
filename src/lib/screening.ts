// src/lib/screening.ts
import { supabase } from './supabase'

export const TF_ORDER = ['D1', 'H4', 'H1', 'M30', 'M15', 'M5'] as const

export type ScreeningState = 'judged' | 'running' | 'queued' | 'never'

export type ScreeningCampaign = {
  id?: number
  base: string
  tf: string
  state: ScreeningState
  judged_on: string | null
  data_dir: string | null
  n_behaviors: number | null
  n_rejected: number | null
  n_marginal: number | null
  n_candidates: number | null
  null_bar: number | null
}

export type ScreeningCandidate = {
  campaign_id: number
  label: string
  rank: number
  filter_families: string[]
  null_pct: number | null
  dd: number | null
  dd_limit: number | null
  wf_oos: number | null
  wf_bar: number | null
  pf_net: number | null
  trades: number | null
  assets_go: number | null
  qualified_assets: string[]
  bot_slug: string | null
  forward_trades: number
}

export type ScreeningEvent = {
  base: string
  tf: string
  happened_on: string
  kind: string
  summary: string
}

/** French number: comma decimal separator, no trailing zeros beyond what was given. */
function fr(n: number): string {
  return String(n).replace('.', ',')
}

/**
 * French thousands separator. toLocaleString('fr-FR') groups with a narrow no-break space
 * (U+202F), sometimes falling back to a regular no-break space (U+00A0) depending on the
 * runtime's ICU data. Both are normalised to the canonical U+202F so every renderer of a
 * screening count is guaranteed the same character regardless of the runtime.
 *
 * Single source of truth for this: a previous per-component copy in ScreeningDossier.tsx used a
 * character class of three plain ASCII spaces instead of the non-breaking variants, so its
 * `.replace()` never matched anything — invisible in the DOM because Testing Library's
 * whitespace normaliser treats every space variant as equivalent, so the component's own test
 * passed anyway (see tests/lib/screening.test.ts's `count` suite, which pins the real codepoint).
 */
export function count(n: number | null): string {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString('fr-FR').replace(/[\u00a0\u202f]/g, '\u202f')
}

/**
 * The cell's one-line state. Never leaks GO_PAPER/MARGINAL/NO_GO, and never says
 * "survivants" — a zero is stated as a result, not as an absence (spec section 4.1).
 */
export function cellLabel(c: ScreeningCampaign): string {
  if (c.state === 'running') return 'en cours'
  if (c.state === 'queued') return 'en file'
  if (c.state === 'never') return 'jamais testé'
  return (c.n_candidates ?? 0) === 0
    ? 'clos · résultat négatif'
    : `${c.n_candidates} en observation`
}

/**
 * "95,16 pour une barre à 95" plus whether it only just clears. `tight` drives the
 * "un souffle" annotation — the margin is what carries fragility (spec section 4.3).
 * For a limit-style bar (drawdown: lower is better) tightness is measured the other way.
 */
export function marginLabel(
  value: number,
  bar: number,
  unit: 'pct' | 'ratio',
): { text: string; tight: boolean } {
  const span = unit === 'pct' ? 2 : 0.1
  const tight = Math.abs(value - bar) <= span
  return { text: `${fr(value)} pour une barre à ${fr(bar)}`, tight }
}

/**
 * Gating seam. No membership system exists in this repo yet (no auth, no payments), so the
 * policy is "everything unlocked". When the membership spec lands, this is the only function
 * that changes: free = the whole grid + one demo dossier, paid = every other dossier.
 */
export function isDossierUnlocked(_base: string, _tf: string): boolean {
  return true
}

export async function getScreeningGrid(): Promise<ScreeningCampaign[]> {
  const { data, error } = await supabase.from('screening_campaigns').select('*')
  if (error) throw new Error(`screening grid: ${error.message}`)
  return (data ?? []) as ScreeningCampaign[]
}

/**
 * Resolves a bot's screening origin by its slug, independent of any strategy-family label the
 * bot record itself carries. Bot.family (trend/breakout/mean-reversion/carry/market-neutral) is
 * a coarse behavioural bucket shared by many distinct screening bases (EMAcross, Donchian,
 * ATRChannel, ... are all "trend"), so it cannot be used to look up a single campaign — hence
 * this direct bot_slug -> candidate -> campaign lookup instead of guessing a base. Degrades to
 * null on any error (including the screening tables not existing yet): a missing provenance
 * block must never break the bot fiche.
 */
export async function getProvenanceForBot(slug: string): Promise<{
  campaign: ScreeningCampaign
  candidate: ScreeningCandidate
} | null> {
  try {
    // .order + .limit(1) instead of relying on at-most-one-row: if a bot is ever re-screened
    // into two candidate rows, .maybeSingle() alone would throw a Supabase "multiple rows"
    // error and silently drop the whole provenance block. Ordering by rank picks the best
    // candidate deterministically instead.
    const { data: candidate, error: e1 } = await supabase
      .from('screening_candidates').select('*').eq('bot_slug', slug)
      .order('rank', { ascending: true }).limit(1).maybeSingle()
    if (e1) {
      console.error('[getProvenanceForBot] candidate lookup failed', e1.message)
      return null
    }
    if (!candidate) return null

    const { data: campaign, error: e2 } = await supabase
      .from('screening_campaigns').select('*').eq('id', candidate.campaign_id).maybeSingle()
    if (e2) {
      console.error('[getProvenanceForBot] campaign lookup failed', e2.message)
      return null
    }
    if (!campaign) return null

    return { campaign: campaign as ScreeningCampaign, candidate: candidate as ScreeningCandidate }
  } catch (e) {
    console.error('[getProvenanceForBot] fetch threw', e)
    return null
  }
}

export async function getStrategyDossier(base: string): Promise<{
  campaigns: ScreeningCampaign[]
  candidates: Record<number, ScreeningCandidate[]>
  events: ScreeningEvent[]
}> {
  const { data: campaigns, error: e1 } = await supabase
    .from('screening_campaigns').select('*').eq('base', base)
  if (e1) throw new Error(`dossier campaigns: ${e1.message}`)

  const ids = (campaigns ?? [])
    .map((c: ScreeningCampaign) => c.id)
    .filter((id): id is number => id != null)
  const { data: cands, error: e2 } = ids.length
    ? await supabase.from('screening_candidates').select('*').in('campaign_id', ids)
    : { data: [], error: null }
  if (e2) throw new Error(`dossier candidates: ${e2.message}`)

  const { data: events, error: e3 } = await supabase
    .from('screening_events').select('*').eq('base', base).order('happened_on', { ascending: false })
  if (e3) throw new Error(`dossier events: ${e3.message}`)

  const byCampaign: Record<number, ScreeningCandidate[]> = {}
  for (const c of (cands ?? []) as ScreeningCandidate[]) {
    ;(byCampaign[c.campaign_id] ??= []).push(c)
  }
  for (const list of Object.values(byCampaign)) list.sort((a, b) => a.rank - b.rank)

  return {
    campaigns: (campaigns ?? []) as ScreeningCampaign[],
    candidates: byCampaign,
    events: (events ?? []) as ScreeningEvent[],
  }
}
