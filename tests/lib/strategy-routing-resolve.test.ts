import { describe, it, expect } from 'vitest'
import { resolveStrategyRoute } from '@/lib/strategy-routing'
import { STRATEGY_FICHES } from '@/lib/strategy-library'

// Fix round 1, finding 4: this is the coverage the missing HTTP observation
// (this worktree has no Supabase credentials, see Task 4/5 reports) would
// have given. `fvg-multi` is a REAL collision in the tree today — a fiche
// slug (strategy-library.ts) that also happens to be a bot slug
// (tests/fixtures/bots.ts:63) — so its case is not hypothetical.
describe('resolveStrategyRoute', () => {
  const ficheSlugs = STRATEGY_FICHES.map(f => f.slug)
  const botSlugs = ['v1-spot', 'orb-bf25', 'fvg-multi']

  it('renders the concept page for a known fiche slug', () => {
    expect(resolveStrategyRoute('orb', ficheSlugs, botSlugs)).toEqual({ kind: 'concept' })
  })

  it('redirects a bot slug that is not a fiche to its /strategies/bot/ page', () => {
    expect(resolveStrategyRoute('v1-spot', ficheSlugs, botSlugs))
      .toEqual({ kind: 'redirect', to: '/strategies/bot/v1-spot' })
  })

  it('fiche wins over an existing bot slug of the same name', () => {
    expect(ficheSlugs).toContain('fvg-multi')
    expect(botSlugs).toContain('fvg-multi')
    expect(resolveStrategyRoute('fvg-multi', ficheSlugs, botSlugs)).toEqual({ kind: 'concept' })
  })

  it('404s a slug that is neither a fiche nor a bot', () => {
    expect(resolveStrategyRoute('nope', ficheSlugs, botSlugs)).toEqual({ kind: 'notFound' })
  })
})
