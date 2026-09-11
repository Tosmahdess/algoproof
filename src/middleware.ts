import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { AUTH_COOKIE_NAME } from '@/lib/auth-cookie'

// Paths where the Supabase session is refreshed. Supabase rotates refresh
// tokens; a rotation nobody persists is a rotation lost, and the member finds
// themselves signed out for no reason they can see. lib/supabase-auth.ts has a
// no-op setAll BY DESIGN and relies on this file running on EVERY path that
// builds that client. tests/middleware.test.ts derives those paths from src/app
// and fails when one is not covered.
//
// /compte is the account page. /api/investir carries the récit route, which
// reads the session to decide what to serve: it was not covered before
// 2026-09-11, so auth-js rotated the token in memory there and the browser kept
// the refresh token it had just consumed. /wealth left the list: next.config.ts
// redirects it in 308 before any middleware runs. The /investir pages are
// static and build no auth client, so they stay out.
//
// No path is walled: the lock lives in the payload, not in a redirect.
export const REFRESH_PATHS = ['/compte', '/api/investir']

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_AUTH_SUPABASE_URL ?? 'http://localhost',
    process.env.NEXT_PUBLIC_AUTH_SUPABASE_ANON_KEY ?? 'anon-dev',
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        // The @supabase/ssr pattern, in this order. A rotated cookie is written
        // on the REQUEST handed downstream, then on the response. Written on
        // the response alone, the route behind this middleware still reads the
        // old cookie in the same request and refreshes again with a token that
        // is already spent.
        setAll: (cookiesToSet, headers) => {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          res = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options),
          )
          // Cache-Control: private, no-store (and friends), passed by the
          // library: a response that sets a session cookie is never cached.
          Object.entries(headers ?? {}).forEach(([key, value]) => res.headers.set(key, value))
        },
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
  // a page that needs nothing from the identity project. A refresh that fails
  // must not take the page down with it.
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
  // segments, but a bare "/compte" slipping through would fail SILENTLY.
  matcher: [
    '/compte', '/compte/:path*',
    '/api/investir', '/api/investir/:path*',
  ],
}
