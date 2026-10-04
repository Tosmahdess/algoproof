import { describe, it, expect, vi, beforeEach } from 'vitest'

// « Les plus gardées » reads the lab's definer function library_idea_star_counts()
// (migration 0029, algolab) with the anon key. Until it exists, or when it fails, the
// sort falls back to size: no count is ever invented, the page never breaks.
const rpc = vi.hoisted(() => ({ result: { data: null as unknown, error: null as unknown }, name: '' }))
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: (n: string) => { rpc.name = n; return Promise.resolve(rpc.result) } } }))
vi.mock('../supabase', () => ({ supabase: { rpc: (n: string) => { rpc.name = n; return Promise.resolve(rpc.result) } } }))

import { getIdeaStarCounts } from '@/lib/library'

beforeEach(() => { rpc.result = { data: null, error: null } })

describe('getIdeaStarCounts', () => {
  it('maps each idea slug to its count', async () => {
    rpc.result = { data: [{ slug: 'hmacross-h4', n: '3' }, { slug: 'orb-h1', n: 1 }], error: null }
    expect(await getIdeaStarCounts()).toEqual({ 'hmacross-h4': 3, 'orb-h1': 1 })
    expect(rpc.name).toBe('library_idea_star_counts')
  })

  it('is empty when the function is missing or fails', async () => {
    rpc.result = { data: null, error: { message: 'Could not find the function public.library_idea_star_counts' } }
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await getIdeaStarCounts()).toEqual({})
    err.mockRestore()
  })
})
