import { describe, it, expect, vi } from 'vitest'

// sitemap.ts pulls in getBotSlugs (src/lib/supabase) and getFicheSitemapData
// (src/lib/supabase-server) transitively. Both createClient() at module load
// time and throw on missing env vars outside a Next.js runtime — mocked here
// the same way tests/lib/queries.test.ts and tests/lib/equity.test.ts do,
// rather than relying on real credentials this worktree does not have.
vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }))
vi.mock('@/lib/supabase-server', () => ({ supabaseServer: { from: vi.fn() } }))

import sitemap from '@/app/sitemap'

describe('sitemap', () => {
  it('never lists a URL carrying a filter parameter', async () => {
    const entries = await sitemap()
    for (const e of entries) {
      expect(e.url, e.url).not.toContain('?')
    }
  })

  it('lists the concept pages', async () => {
    const urls = (await sitemap()).map(e => e.url)
    expect(urls).toContain('https://algoproof.fr/strategies/orb')
  })

  it('does not list the retired /performance route', async () => {
    const urls = (await sitemap()).map(e => e.url)
    expect(urls.some(u => u.endsWith('/performance'))).toBe(false)
  })
})
