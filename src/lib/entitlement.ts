import type { createServerClient } from '@supabase/ssr'

export type Entitlement = 'guest' | 'free' | 'paid'

/**
 * Statuses that count as paying, here and everywhere else.
 *
 * This list used to be `['active', 'trialing']` while the lab API said
 * `active, trialing, past_due` and the dossier SQL said `active` only. A member
 * whose renewal was failing therefore kept the lab, lost the dossiers, and read
 * "free" on this site: three products, one customer, and no sentence that could
 * describe it truthfully in the terms.
 *
 * The rule, decided 2026-09-03: a failing renewal KEEPS its access for as long
 * as Stripe is retrying. `past_due` means a card expired, not a refusal to pay,
 * and the retry window is short and bounded. `unpaid` and `canceled` end
 * access — Stripe draws that line, not us.
 *
 * Mirrors api/entitlement_status.py PAID_STATUSES, web/lib/entitlement.ts and
 * public.has_live_subscription() in migration 040.
 */
export const PAID_STATUSES = ['active', 'trialing', 'past_due'] as const

// The single source of truth for gating on this site.
//   guest = no session
//   free  = signed in, no active subscription
//   paid  = subscription in PAID_STATUSES (a failing renewal still pays)
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
      .in('status', PAID_STATUSES as unknown as string[])
      .limit(1)
      .maybeSingle()
    return data ? 'paid' : 'free'
  } catch (e) {
    // 'guest' is the safe direction and it stays. What must not stay is the
    // SILENCE: this catch is the shape that downgraded every visitor on
    // 2026-08-30, members included, while the site looked perfectly healthy and
    // nothing anywhere said a word. A wrong answer that logs is a bug you find
    // in minutes; a wrong answer that says nothing is one you find from a
    // customer e-mail.
    console.error('[entitlement] read failed, treating the visitor as a guest:', e)
    return 'guest'
  }
}
