// src/lib/screening.ts
//
// MEASURED LEAK, 2026-09-12. With the site's publishable (anon) key,
//   GET /rest/v1/screening_campaigns?select=*   returned `null_bar`
//   GET /rest/v1/screening_candidates?select=*  returned `wf_bar`, `dd_limit`
// which are the judge's CLASSIFIED gate thresholds (algolab DECISIONS 2026-07-28
// « seuils classés JAMAIS »; migration 024 « Thresholds are classified too »).
// Migration 024 redacted the verdict tables and never touched these two, and
// BotProvenance printed the measured value next to that bar on a public bot fiche.
//
// Three things changed here, and the order matters:
//   1. the bar columns left these types, so no caller can reach for them;
//   2. every read names its columns instead of `select('*')`, so the payload is
//      what the page needs and nothing more;
//   3. `marginLabel` is gone: its only job was to print a measured value NEXT TO
//      its bar, which is the sentence that leaked. The fiche now prints the
//      measured value alone (BotProvenance).
// Migration 046 closes the database side with column-level privileges. Until it
// is applied by hand, the columns are still readable by anyone with the anon key:
// the site no longer asks for them, which is necessary and not sufficient.
import { supabase } from './supabase'
import { GROUP_SPACE } from './display'

export type ScreeningState = 'judged' | 'running' | 'queued' | 'never'

// The columns each read asks for. Kept next to the types, as one string, because
// supabase-js types the result rows from the literal it is given.
const CAMPAIGN_COLUMNS =
  'id,base,tf,state,judged_on,data_dir,n_behaviors,n_rejected,n_marginal,n_candidates,n_assets'
const CANDIDATE_COLUMNS =
  'campaign_id,label,rank,filter_families,null_pct,dd,wf_oos,pf_net,trades,assets_go,qualified_assets,bot_slug,forward_trades'

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
  n_assets: number | null
  // NO `null_bar`. See the header.
}

export type ScreeningCandidate = {
  campaign_id: number
  label: string
  rank: number
  filter_families: string[]
  // Measured values, publishable: they say what this configuration did.
  null_pct: number | null
  dd: number | null
  wf_oos: number | null
  pf_net: number | null
  trades: number | null
  assets_go: number | null
  qualified_assets: string[]
  bot_slug: string | null
  forward_trades: number
  // NO `wf_bar`, NO `dd_limit`. See the header.
}

/** French number: comma decimal separator, no trailing zeros beyond what was given. */
export function fr(n: number): string {
  return String(n).replace('.', ',')
}

/**
 * French date: `judged_on`/`happened_on` are stored as bare `YYYY-MM-DD` dates with no time
 * component. Parsing them directly (`new Date('2026-07-22')`) reads them as UTC midnight, which
 * a negative-offset local timezone then rolls back to the previous day. Anchoring to noon UTC
 * before formatting avoids that off-by-one regardless of the viewer's timezone.
 */
export function frDate(d: string | null): string {
  if (d === null) return '—'
  return new Date(`${d}T12:00:00Z`).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

/**
 * French thousands separator. toLocaleString('fr-FR') groups with a narrow no-break space
 * (U+202F), sometimes falling back to a regular no-break space (U+00A0) depending on the
 * runtime's ICU data. Both are normalised to ONE character so every renderer of a
 * screening count is guaranteed the same one regardless of the runtime: GROUP_SPACE
 * (U+00A0, lot 5 of the design audit, 2026-09-25), the same as display.ts's frNumber,
 * because Inter renders U+202F under 2 px at 13 px and « 1 406 » read « 1406 ».
 *
 * Single source of truth for this: a previous per-component copy in ScreeningDossier.tsx used a
 * character class of three plain ASCII spaces instead of the non-breaking variants, so its
 * `.replace()` never matched anything — invisible in the DOM because Testing Library's
 * whitespace normaliser treats every space variant as equivalent, so the component's own test
 * passed anyway (see tests/lib/screening.test.ts's `count` suite, which pins the real codepoint).
 */
export function count(n: number | null): string {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString('fr-FR').replace(/[  ]/g, GROUP_SPACE)
}

/**
 * Resolves a bot's screening origin by its slug, independent of any strategy-family label the
 * bot record itself carries. Bot.family (the nine slugs in src/lib/families.ts — trend, momentum,
 * breakout, mean-reversion, price-action, carry, market-neutral, stat-arb, event) is
 * a coarse behavioural bucket shared by many distinct screening bases (EMAcross, Donchian,
 * ATRChannel, ... are all "trend"), so it cannot be used to look up a single campaign — hence
 * this direct bot_slug -> candidate -> campaign lookup instead of guessing a base. Degrades to
 * null on any error (including the screening tables not existing yet): a missing provenance
 * block must never break the bot fiche.
 *
 * The column lists are load-bearing, not tidiness: after migration 046 revokes table-wide
 * SELECT and grants it per column, a `select('*')` here would be refused outright.
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
      .from('screening_candidates_public').select(CANDIDATE_COLUMNS).eq('bot_slug', slug)
      .order('rank', { ascending: true }).limit(1).maybeSingle()
    if (e1) {
      console.error('[getProvenanceForBot] candidate lookup failed', e1.message)
      return null
    }
    if (!candidate) return null

    const { data: campaign, error: e2 } = await supabase
      .from('screening_campaigns_public').select(CAMPAIGN_COLUMNS)
      .eq('id', (candidate as ScreeningCandidate).campaign_id).maybeSingle()
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
