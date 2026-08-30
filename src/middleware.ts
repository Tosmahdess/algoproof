import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { AUTH_COOKIE_NAME } from '@/lib/auth-cookie'

// Paths where the Supabase session is refreshed. Supabase rotates refresh
// tokens; a rotation nobody persists is a rotation lost, and the member finds
// themselves signed out for no reason they can see. lib/supabase-auth.ts has a
// no-op setAll BY DESIGN and relies on this file running.
//
// No path is walled. /wealth is browsable by everyone; the lock lives in the
// payload (Tasks 7 to 9), not in a redirect.
export const REFRESH_PATHS = ['/wealth', '/compte']

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_AUTH_SUPABASE_URL ?? 'http://localhost',
    process.env.NEXT_PUBLIC_AUTH_SUPABASE_ANON_KEY ?? 'anon-dev',
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) =>
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options),
          ),
      },
      // AUTH_COOKIE_NAME comes from lib/auth-cookie.ts, not a literal here: it is
      // what keeps this project's session cookie from colliding with
      // lab.algoproof.fr, which authenticates against the same Supabase project.
      cookieOptions: { name: AUTH_COOKIE_NAME },
    },
  )
  // The call itself is the refresh: getUser() rotates the cookie through setAll.
  // supabase-js re-throws anything that is not an AuthError (corrupt cookie
  // chunks, env misconfiguration) — an unenumerable class sitting in front of
  // a PUBLIC page that needs nothing from the identity project. A refresh
  // that fails must not take the page down with it.
  try {
    await supabase.auth.getUser()
  } catch {
    return res
  }
  return res
}

export const config = {
  // Must stay in step with REFRESH_PATHS; tests/middleware.test.ts pins them.
  // Both forms are listed on purpose: "/x/:path*" is documented as zero-or-more
  // segments, but a bare "/wealth" slipping through would fail SILENTLY.
  matcher: [
    '/wealth', '/wealth/:path*',
    '/compte', '/compte/:path*',
  ],
}
