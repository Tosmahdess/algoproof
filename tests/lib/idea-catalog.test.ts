// Idea favorites (chantier bibliotheque, lot 2): the site publishes its library ideas at
// /api/catalog/ideas for the lab, as strategies (lot C, D081). Only the fields a
// favorite shows leave; the item's identity is the idea's URL slug, which must never
// collide (a collision would hand one reader's star to another idea).
import { describe, it, expect } from 'vitest'
import { ideaCatalog } from '@/lib/public-catalog'
import { ideaSlug, type LibraryIdea } from '@/lib/library'
import { pagePath } from '@/lib/favorites-client'

const idea = (idea_key: string, family = 'trend'): LibraryIdea => {
  const [base, tf] = idea_key.split('|')
  return { idea_key, base, tf, family, n_variants: 3, n_backtest: 1, n_awaiting: 1, n_trailing: 0,
    n_not_surviving: 0, n_running: 2, n_live: 0, n_paper: 2, n_stopped: 0, n_sim_up: 0, n_sim_down: 0,
    n_sim_young: 2, pf_q1: null, pf_median: null, pf_q3: null, n_pf: 0, last_found_at: null }
}

describe('idea catalog', () => {
  it('names each idea by its slug, in the site words, and nothing else', () => {
    const [e] = ideaCatalog([idea('HMAcross|H4')])
    expect(e).toEqual({ slug: 'hmacross-h4', title: 'Croisement HMA H4', idea_key: 'HMAcross|H4', tf: 'H4',
      family: 'trend', family_label: 'Suivi de tendance' })
  })

  it('refuses to publish two ideas under one slug', () => {
    expect(() => ideaCatalog([idea('HMAcross|H4'), idea('HMACross|H4')])).toThrow(/hmacross-h4/)
  })
})

describe('ideaSlug', () => {
  it('is lower case base-tf, the URL the library already serves', () => {
    expect(ideaSlug('DonchianBreakout|D1')).toBe('donchianbreakout-d1')
  })
})

describe('pagePath', () => {
  it('sends an idea favorite back to its library page', () => {
    expect(pagePath('idea', 'hmacross-h4')).toBe('/bibliotheque/hmacross-h4')
  })
})
