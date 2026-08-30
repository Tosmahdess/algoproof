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
  // Fails closed. supabase-js returns a network error INSIDE the result and
  // never contacts the identity project when there is no session cookie, but
  // it re-throws anything that is not an AuthError (corrupt cookie chunks,
  // env misconfiguration) — an unenumerable class this function cannot list
  // exhaustively. Guest on a public page is nothing; 'guest' during an
  // identity blip means a paying member sees locked content, not a crash.
  try {
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
  } catch {
    return 'guest'
  }
}
