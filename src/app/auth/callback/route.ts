import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { safeNext } from '@/lib/safe-redirect'
import { AUTH_COOKIE_NAME } from '@/lib/auth-cookie'

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
        cookieOptions: { name: AUTH_COOKIE_NAME },
      },
    )
    await supabase.auth.exchangeCodeForSession(code)
  }
  return res
}
