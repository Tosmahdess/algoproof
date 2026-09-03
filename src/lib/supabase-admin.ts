// Privileged, server-only Supabase client. The ONLY reader of the paid columns
// of `equity_fiches` (see lib/equity.ts). Never import this from a 'use client'
// module — MiRegimeBadge already proves the transitive path is real: it imports
// @/lib/queries, which imports ./supabase, which is why the CONTENT project's
// publishable key ships in the browser bundle today.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cached: SupabaseClient | null = null

/**
 * Built lazily and deliberately NOT at module load: a throw at import time would
 * take the whole build down, and this module is pulled in by a route that also
 * serves guests.
 *
 * It throws on a missing key instead of falling back to the publishable one. The
 * fallback is the tempting shape and it is the wrong one: it would keep the page
 * working while quietly restoring exactly the read this change exists to remove.
 * Failing here locks the analysis for a paying member — visible, loud, and the
 * safe direction — instead of serving the corpus to everyone.
 *
 * An EMPTY string counts as missing. `process.env.X!` is satisfied by '' and the
 * vault has paid for that twice (feedback_empty_secret_still_verifies): a secret
 * set to the empty string verified successfully against the empty string.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('SUPABASE_URL is missing — cannot read the paid fiche columns')
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is missing — refusing to read the paid fiche columns ' +
        'with the publishable key. Set it on the algoproof Vercel project (all targets).',
    )
  }
  cached = createClient(url, key, { auth: { persistSession: false } })
  return cached
}
