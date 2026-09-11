import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// 'throw': getUser() throws (corrupt cookie chunk). 'rotate': getUser() rotates
// the session through setAll, exactly as auth-js does on a refresh.
const state = vi.hoisted(() => ({ mode: 'throw' as 'throw' | 'rotate' }))

vi.mock('@supabase/ssr', () => ({
  createServerClient: (
    _url: string,
    _key: string,
    opts: { cookies: { setAll: (c: { name: string; value: string; options: object }[], h: Record<string, string>) => void } },
  ) => ({
    auth: {
      getUser: async () => {
        if (state.mode === 'throw') throw new Error('corrupt cookie chunk')
        opts.cookies.setAll(
          [{ name: 'sb-algoproof-test', value: 'rotated-token', options: { path: '/', httpOnly: true } }],
          { 'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0' },
        )
        return { data: { user: null }, error: null }
      },
    },
  }),
}))

import { NextRequest } from 'next/server'
import { REFRESH_PATHS, config, middleware } from '@/middleware'

beforeEach(() => { state.mode = 'throw' })

describe('middleware getUser guard', () => {
  it('returns a response instead of throwing when getUser() throws', async () => {
    const req = new NextRequest('http://localhost/compte')
    const res = await middleware(req)
    expect(res).toBeDefined()
    expect(res.status).toBe(200)
  })
})

// 2026-09-11 review (P1): the récit route builds createSupabaseAuthServer, whose
// setAll is a no-op, but no middleware ran on /api/investir. A refresh there
// rotated the token in memory and the browser kept the consumed one.
describe('middleware on /api/investir/x, a rotated session reaches both sides', () => {
  it('writes the rotated cookie on the response AND on the request handed downstream', async () => {
    state.mode = 'rotate'
    const req = new NextRequest('http://localhost/api/investir/x/recit', {
      headers: { cookie: 'sb-algoproof-test=stale-token' },
    })
    const res = await middleware(req)
    // the browser gets the new cookie
    expect(res.cookies.get('sb-algoproof-test')?.value).toBe('rotated-token')
    // the route behind the middleware reads the new cookie in the same request
    // (Next forwards overridden request headers as x-middleware-request-*)
    const forwarded = res.headers.get('x-middleware-request-cookie') ?? ''
    expect(forwarded).toContain('sb-algoproof-test=rotated-token')
    expect(forwarded).not.toContain('stale-token')
    // a response that sets a session cookie is not cacheable
    expect(res.headers.get('cache-control')).toMatch(/private/)
    expect(res.headers.get('cache-control')).toMatch(/no-store/)
  })
})

/** The matcher entries this file uses, as Next reads them: "/x" is exactly /x,
 *  "/x/:path*" is /x followed by zero or more segments. */
function covered(urlPath: string): boolean {
  return config.matcher.some(m => {
    const base = m.replace('/:path*', '')
    return m.endsWith('/:path*')
      ? urlPath === base || urlPath.startsWith(base + '/')
      : urlPath === base
  })
}

describe('middleware matcher', () => {
  it('covers every refresh path, in both bare and nested form', () => {
    for (const p of REFRESH_PATHS) {
      expect(config.matcher).toContain(p)
      expect(config.matcher).toContain(`${p}/:path*`)
    }
  })

  it('lists nothing the refresh paths do not claim', () => {
    for (const m of config.matcher) {
      const base = m.replace('/:path*', '')
      expect(REFRESH_PATHS).toContain(base)
    }
  })

  it('runs on /api/investir/x, and no longer claims /wealth (redirected before middleware)', () => {
    expect(covered('/api/investir/x/recit')).toBe(true)
    expect(config.matcher.some(m => m.startsWith('/wealth'))).toBe(false)
  })

  // The class rule. lib/supabase-auth.ts cannot write cookies; every file of
  // src/app that builds that client must sit on a path this middleware covers,
  // or the rotation it triggers is lost.
  it('covers the path of every src/app file that calls createSupabaseAuthServer', () => {
    const appDir = path.resolve(__dirname, '../src/app')
    const callers: string[] = []
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name)
        if (e.isDirectory()) { if (e.name !== '__tests__') walk(full); continue }
        if (!/\.(ts|tsx)$/.test(e.name) || /\.test\.tsx?$/.test(e.name)) continue
        if (fs.readFileSync(full, 'utf8').includes('createSupabaseAuthServer(')) callers.push(full)
      }
    }
    walk(appDir)
    // non-vacuity: /compte and the récit route are the two known callers today
    expect(callers.length).toBeGreaterThanOrEqual(2)

    const uncovered = callers
      .map(f => {
        const segs = path.relative(appDir, path.dirname(f)).split(path.sep).filter(Boolean)
          .filter(s => !/^\(.*\)$/.test(s))              // route groups add no segment
          .map(s => (/^\[.*\]$/.test(s) ? 'x' : s))       // any dynamic segment
        return '/' + segs.join('/')
      })
      .filter(p => !covered(p))
    expect(uncovered).toEqual([])
  })
})
