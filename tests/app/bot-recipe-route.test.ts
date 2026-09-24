// tests/app/bot-recipe-route.test.ts
//
// The exact recipe of a wave bot is what the labo membership sells. The fiche
// is static (ISR), so the gate is this route: the privileged read happens
// ONLY after getEntitlement says 'paid', and no answer is ever cacheable.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = vi.hoisted(() => ({
  entitlement: 'guest' as 'guest' | 'free' | 'paid',
  queried: [] as string[],
  privileged: true,
  rows: [{ recipe: { tf: 'H4', params: { period: 7 } } }] as unknown[] | null,
  error: null as unknown,
}))

vi.mock('@/lib/supabase-auth', () => ({ createSupabaseAuthServer: async () => ({}) }))
vi.mock('@/lib/entitlement', () => ({ getEntitlement: async () => state.entitlement }))
vi.mock('@/lib/supabase-server', () => {
  throw new Error('the anon content client must never serve a recipe')
})
vi.mock('@/lib/supabase-privileged', () => ({
  supabasePrivileged: () => (state.privileged ? {
    from: (table: string) => ({
      select: () => ({
        eq: (_col: string, slug: string) => ({
          limit: async () => {
            state.queried.push(`${table}:${slug}`)
            return { data: state.rows, error: state.error }
          },
        }),
      }),
    }),
  } : null),
}))

import * as route from '@/app/api/bot/[slug]/recipe/route'

const SLUG = 'arm-synthetic-h4-head00'

async function call() {
  const res = await route.GET(new Request(`http://localhost/api/bot/${SLUG}/recipe`), {
    params: Promise.resolve({ slug: SLUG }),
  })
  return { res, body: await res.json() }
}

beforeEach(() => {
  state.entitlement = 'guest'
  state.queried = []
  state.privileged = true
  state.rows = [{ recipe: { tf: 'H4', params: { period: 7 } } }]
  state.error = null
})

describe('/api/bot/[slug]/recipe', () => {
  it('is rendered per request', () => {
    expect(route.dynamic).toBe('force-dynamic')
  })

  it.each(['guest', 'free'] as const)('a %s visitor gets no recipe and triggers no read', async (e) => {
    state.entitlement = e
    const { res, body } = await call()
    expect(body).toEqual({ entitlement: e })
    expect(state.queried).toEqual([])
    expect(res.headers.get('cache-control')).toBe('private, no-store')
  })

  it('a member gets the recipe, read once by slug', async () => {
    state.entitlement = 'paid'
    const { res, body } = await call()
    expect(body).toEqual({ entitlement: 'paid', recipe: { tf: 'H4', params: { period: 7 } } })
    expect(state.queried).toEqual([`bot_recipes:${SLUG}`])
    expect(res.headers.get('cache-control')).toBe('private, no-store')
  })

  it('a member with no service key gets an explicit unavailable answer', async () => {
    state.entitlement = 'paid'
    state.privileged = false
    const { res, body } = await call()
    expect(body).toEqual({ entitlement: 'paid', indisponible: true })
    expect(res.headers.get('cache-control')).toBe('private, no-store')
  })

  it('a member on a slug with no row, or a failed read, is told unavailable, never a 500', async () => {
    state.entitlement = 'paid'
    state.rows = []
    expect((await call()).body).toEqual({ entitlement: 'paid', indisponible: true })
    state.rows = null
    state.error = { message: 'boom' }
    const { res, body } = await call()
    expect(res.status).toBe(200)
    expect(body).toEqual({ entitlement: 'paid', indisponible: true })
  })
})
