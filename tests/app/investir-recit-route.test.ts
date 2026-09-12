// tests/app/investir-recit-route.test.ts
//
// 2026-09-11 review (P5), user decision, temporary: the 27 companies the rule
// does not grade sold « deux paragraphes » they do not have. Until an offer
// exists for them, whatever investir_recits holds for them is served to
// everyone, through the same privileged read as the member path. A graded
// company is unchanged: nothing for a guest, and no Supabase read at all.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = vi.hoisted(() => ({
  entitlement: 'guest' as 'guest' | 'free' | 'paid',
  queried: [] as string[],
  row: { lecture: null as string | null, risques: 'Un risque propre à cette société.' as string | null },
}))

vi.mock('@/lib/supabase-auth', () => ({ createSupabaseAuthServer: async () => ({}) }))
vi.mock('@/lib/entitlement', () => ({ getEntitlement: async () => state.entitlement }))
vi.mock('@/lib/supabase-privileged', () => ({
  supabasePrivileged: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: (_col: string, slug: string) => ({
          limit: async () => {
            state.queried.push(`${table}:${slug}`)
            return { data: [state.row], error: null }
          },
        }),
      }),
    }),
  }),
}))

import { GET } from '@/app/api/investir/[slug]/recit/route'
import { listeHorsPerimetre, tousLesSlugs } from '@/lib/investir'

const HORS = listeHorsPerimetre()[0].slug
const NOTEE = tousLesSlugs()[0]

async function call(slug: string) {
  const res = await GET(new Request(`http://localhost/api/investir/${slug}/recit`), {
    params: Promise.resolve({ slug }),
  })
  return { res, body: await res.json() }
}

beforeEach(() => {
  state.entitlement = 'guest'
  state.queried = []
})

describe('/api/investir/[slug]/recit', () => {
  it('the two lists do not overlap, so a graded slug can never take the open branch', () => {
    const graded = new Set(tousLesSlugs())
    expect(listeHorsPerimetre().length).toBeGreaterThan(0)
    expect(listeHorsPerimetre().filter(f => graded.has(f.slug))).toEqual([])
  })

  it('a guest on an out-of-scope company gets its blocks', async () => {
    const { body } = await call(HORS)
    expect(body.blocs).toEqual(state.row)
    expect(state.queried).toEqual([`investir_recits:${HORS}`])
  })

  it('a guest on a graded company gets no block, and nothing is read', async () => {
    const { body } = await call(NOTEE)
    expect(body).toEqual({ entitlement: 'guest' })
    expect(body.blocs).toBeUndefined()
    expect(state.queried).toEqual([])
  })

  it('a slug that is in neither list is not opened by the request', async () => {
    const { body } = await call('pas-une-societe')
    expect(body.blocs).toBeUndefined()
    expect(state.queried).toEqual([])
  })

  it('a member on a graded company still gets the blocks, and the response is never cacheable', async () => {
    state.entitlement = 'paid'
    const { res, body } = await call(NOTEE)
    expect(body.blocs).toEqual(state.row)
    expect(res.headers.get('cache-control')).toBe('private, no-store')
  })

  it('no response of this route is cacheable, whatever the branch', async () => {
    for (const slug of [HORS, NOTEE]) {
      const { res } = await call(slug)
      expect(res.headers.get('cache-control'), slug).toBe('private, no-store')
    }
  })
})
