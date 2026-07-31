import { describe, it, expect } from 'vitest'
import { STRATEGY_FICHES } from '@/lib/strategy-library'
import config from '../../next.config'

describe('strategy routing', () => {
  it('no redirect source pattern swallows a concept URL', async () => {
    const redirects = await (config as { redirects?: () => Promise<{ source: string }[]> }).redirects?.() ?? []
    for (const f of STRATEGY_FICHES) {
      for (const r of redirects) {
        // A source of the shape /strategies/:param (one dynamic segment, no
        // literal prefix) would match every concept slug.
        const shadows = /^\/strategies\/:[A-Za-z]+$/.test(r.source)
        expect(shadows, `${r.source} shadows /strategies/${f.slug}`).toBe(false)
      }
    }
  })

  it('no fiche slug collides with the reserved bot segment', () => {
    expect(STRATEGY_FICHES.some(f => f.slug === 'bot')).toBe(false)
  })
})
