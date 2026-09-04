import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * A server-only client that bypasses RLS, for the columns the membership sells.
 *
 * `equity_fiches` carries a `FOR SELECT USING (true)` policy on every column,
 * including the four prose blocks a member pays to read. The paywall lives only
 * in the Next page, so anyone holding the anon key could read the whole
 * analysis without paying. The key is in no client bundle today, which is why
 * this was a P1 and not a P0 -- but "the key has not leaked yet" is not an
 * access control.
 *
 * The fix has two halves and they must land in this order:
 *   1. this client, used by getFicheFull and nothing else (shipped first, and
 *      it falls back to the anon client so nothing breaks while the key is
 *      absent);
 *   2. migration 041, which revokes those four columns from `anon`.
 *
 * Applying 041 before SUPABASE_SERVICE_ROLE_KEY exists on Vercel would empty
 * the paid analyses for everyone, so the fallback below is deliberate and the
 * log line is how you find out the key is still missing.
 */
let cached: SupabaseClient | null | undefined

export function supabasePrivileged(): SupabaseClient | null {
  if (cached !== undefined) return cached

  const url = process.env.SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!url || !key) {
    console.error(
      '[supabase-privileged] SUPABASE_SERVICE_ROLE_KEY is not set: the paid analysis columns ' +
        'are being read with the anon key, which is the exact access the paywall is meant to close.',
    )
    cached = null
    return cached
  }

  cached = createClient(url, key, { auth: { persistSession: false } })
  return cached
}

/** Test seam: the module caches its client, and a test that stubs the env
 *  otherwise sees the first decision forever. */
export function resetPrivilegedClientForTests(): void {
  cached = undefined
}
