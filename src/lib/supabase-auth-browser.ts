import { createBrowserClient } from '@supabase/ssr'
import { AUTH_COOKIE_NAME } from '@/lib/auth-cookie'

// Browser half of the identity client. Only the sign-in form uses it.
// See lib/supabase-auth.ts for why cookieOptions.name is set.
export function createSupabaseAuthBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_AUTH_SUPABASE_URL ?? 'http://localhost',
    process.env.NEXT_PUBLIC_AUTH_SUPABASE_ANON_KEY ?? 'anon-dev',
    { cookieOptions: { name: AUTH_COOKIE_NAME } },
  )
}
