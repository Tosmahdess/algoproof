import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { AUTH_COOKIE_NAME } from '@/lib/auth-cookie'

// Identity and subscriptions live in the ALGOLAB Supabase project, not in this
// site's own. Content (equity_fiches, growth_universe) is read through
// lib/supabase-server.ts and must never be queried here: a table that does not
// exist in this project returns an error, not an exception, so the mistake is
// silent. tests/lib/supabase-auth.test.ts pins the two projects apart.
//
// cookieOptions.name is NOT decoration. @supabase/ssr derives its default cookie
// name from the project ref, and lab.algoproof.fr authenticates against the SAME
// project. Without a distinct name, two same-named cookies reach the lab in
// undefined order and break a live paying product. See lib/auth-cookie.ts.
export async function createSupabaseAuthServer() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_AUTH_SUPABASE_URL ?? 'http://localhost',
    process.env.NEXT_PUBLIC_AUTH_SUPABASE_ANON_KEY ?? 'anon-dev',
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        // A no-op by design: a React Server Component cannot write cookies.
        // The session is refreshed in src/middleware.ts, which does write them.
        setAll: () => {},
      },
      cookieOptions: { name: AUTH_COOKIE_NAME },
    },
  )
}
