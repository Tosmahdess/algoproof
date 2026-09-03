import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { safeNext } from '@/lib/safe-redirect'
import { AUTH_COOKIE_NAME } from '@/lib/auth-cookie'

/**
 * A variable this route cannot do without.
 *
 * The pair used to be read with `?? 'http://localhost'` / `?? 'anon-dev'`,
 * which turns a configuration mistake into a sign-in that fails for reasons
 * nobody can see. In production an absent value throws; outside it, the
 * placeholder keeps local development working and says so once.
 */
function requireAuthEnv(name: string, devValue: string): string {
  const value = process.env[name]?.trim()
  if (value) return value
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is not set: the magic-link callback cannot sign anyone in.`)
  }
  console.warn(`[auth/callback] ${name} is not set, using a development placeholder.`)
  return devValue
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// The magic link lands here. The client is built inline rather than through
// lib/supabase-auth.ts because this is the one place that must WRITE the
// session cookie, and it writes it onto `res`.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const next = safeNext(req.nextUrl.searchParams.get('next'))
  const res = NextResponse.redirect(new URL(next, req.url))
  if (code) {
    const supabase = createServerClient(
      // Not `?? 'http://localhost'`: a missing variable here does not degrade
      // the sign-in, it breaks it, and a placeholder only hides which of the
      // two it was. In production this refuses rather than pretends.
      requireAuthEnv('NEXT_PUBLIC_AUTH_SUPABASE_URL', 'http://localhost'),
      requireAuthEnv('NEXT_PUBLIC_AUTH_SUPABASE_ANON_KEY', 'anon-dev'),
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (cookiesToSet) =>
            cookiesToSet.forEach(({ name, value, options }) =>
              res.cookies.set(name, value, options),
            ),
        },
        cookieOptions: { name: AUTH_COOKIE_NAME },
      },
    )
    await supabase.auth.exchangeCodeForSession(code)
  }
  return res
}
