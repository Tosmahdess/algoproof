import type { createServerClient } from '@supabase/ssr'

export type Entitlement = 'guest' | 'free' | 'paid'

// The single source of truth for gating on this site.
//   guest = no session
//   free  = signed in, no active subscription
//   paid  = subscription active or trialing
// `subscriptions` lives in the IDENTITY project; pass a client from
// lib/supabase-auth.ts, never the content client.
export async function getEntitlement(
  supabase: ReturnType<typeof createServerClient>,
): Promise<Entitlement> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'guest'
  // .limit(1) before .maybeSingle(): a re-subscribing member briefly holds two
  // rows in (active, trialing). Without the limit, maybeSingle() errors on more
  // than one row and this function reports "free" for somebody who is paying
  // twice. Ported from algolab web/lib/entitlement.ts, where it was a real bug.
  const { data } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing'])
    .limit(1)
    .maybeSingle()
  return data ? 'paid' : 'free'
}
