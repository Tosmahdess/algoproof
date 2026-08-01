// src/lib/funnel.ts
// The denominator nobody else publishes.
//
// The False Strategy Theorem (Bailey & López de Prado, SSRN 3221798) says no
// Sharpe threshold can reject a worthless strategy while the number of trials is
// hidden. Composer lists ~2600 strategies, Tradetron ~10000, MQL5 thousands —
// none publishes how many configurations were searched. This number is that
// count, which is what makes every other figure on the site interpretable.
//
// Read from a single view so the same number appears on every surface at the same
// instant; three separate queries could be served from three snapshots inside one
// render.
import { supabase } from './supabase'

export interface FunnelCounts {
  n_tested: number
  n_promoted: number
  n_live: number
}

export async function getFunnelCounts(): Promise<FunnelCounts | null> {
  const { data, error } = await supabase
    .from('funnel_counts')
    .select('n_tested,n_promoted,n_live')
    .single()
  if (error || !data) return null
  return data as FunnelCounts
}
