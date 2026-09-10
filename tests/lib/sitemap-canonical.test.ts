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

  // FIX (final whole-branch review, I3): asserting only that /performance is
  // GONE let its replacement be absent too, which is what happened — /overview,
  // the page that absorbed it and carries the FAQ JSON-LD, was the single page
  // this file did not list. A removal test needs its positive counterpart.
  it('lists /overview, the route that absorbed /performance', async () => {
    const entries = await sitemap()
    const overview = entries.find(e => e.url === 'https://algoproof.fr/overview')
    expect(overview, 'the fleet page must be indexable').toBeTruthy()
    expect(overview!.priority).toBe(0.9)
  })

  // Audit 2026-09-09: /investir was listed twice (monthly at 0.9, daily at
  // 0.7), a leftover of the /wealth merge. The same URL twice with two
  // priorities says two contradictory things about one page.
  it('lists no URL twice', async () => {
    const urls = (await sitemap()).map(e => e.url)
    expect(urls.length).toBeGreaterThan(10) // not vacuous on an empty sitemap
    const twice = urls.filter((u, i) => urls.indexOf(u) !== i)
    expect(twice).toEqual([])
    // and the page that was doubled is still there, once
    expect(urls.filter(u => u === 'https://algoproof.fr/investir')).toHaveLength(1)
  })
})
