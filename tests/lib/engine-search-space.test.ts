import { describe, expect, it } from 'vitest'
import { pickCorpusRow, toSearchSpace, type SearchSpaceRow } from '@/lib/engine-search-space'
import { gauntletFunnel } from '@/lib/gauntlet-explainer'

// Measured on the production table on 2026-09-25 (audit P0-3): every row published
// since 2026-08-24 carries n_params / n_filter_configs / n_exits = null, and each
// publish writes THREE rows a second apart (one per rung, the corpus row being the
// one with the largest n_behaviors and n_judged = 20 000). `getSearchSpace` took the
// newest row (a rung, 1 620 behaviours) and then rejected it for its null grid, so
// /strategies served the figure-less fallback while the home printed 41 million.

const row = (over: Partial<SearchSpaceRow>): SearchSpaceRow => ({
  base: 'EMAcross', tf: 'D1',
  n_params: null, n_filter_configs: null, n_exits: null,
  n_behaviors: 1620, n_judged: 1620,
  published_at: '2026-09-18T10:56:19.550246+00:00',
  ...over,
})

const BATCH: SearchSpaceRow[] = [
  row({ n_behaviors: 1620, n_judged: 1620, published_at: '2026-09-18T10:56:19.550246+00:00' }),
  row({ n_behaviors: 3485, n_judged: 3485, published_at: '2026-09-18T10:56:18.751867+00:00' }),
  row({ n_behaviors: 3931894, n_judged: 20000, published_at: '2026-09-18T10:55:54.281400+00:00' }),
  // an older batch, must be ignored even though its corpus is bigger
  row({ n_behaviors: 9999999, n_judged: 20000, published_at: '2026-09-05T11:00:04.274467+00:00' }),
]

describe('pickCorpusRow', () => {
  it('picks the corpus row of the newest batch: largest n_behaviors within the batch', () => {
    const picked = pickCorpusRow(BATCH)
    expect(picked?.n_behaviors).toBe(3931894)
    expect(picked?.n_judged).toBe(20000)
  })

  it('ignores an older batch, however large', () => {
    expect(pickCorpusRow(BATCH)?.published_at).toContain('2026-09-18')
  })

  it('returns null on no rows', () => {
    expect(pickCorpusRow([])).toBeNull()
  })
})

describe('toSearchSpace', () => {
  it('keeps the corpus and judged counts when the grid sizes are unknown', () => {
    const s = toSearchSpace(row({ n_behaviors: 3931894, n_judged: 20000 }))
    expect(s).not.toBeNull()
    expect(s!.nBehaviors).toBe(3931894)
    expect(s!.nJudged).toBe(20000)
    expect(s!.nParams).toBeNull()
  })

  it('still carries the grid when the publisher wrote it', () => {
    const s = toSearchSpace(row({ n_params: 66, n_filter_configs: 17780, n_exits: 31, n_behaviors: 2782865, n_judged: 20000 }))
    expect(s!.nParams).toBe(66)
    expect(s!.nExits).toBe(31)
  })

  it('returns null when even the corpus count is missing', () => {
    expect(toSearchSpace(row({ n_behaviors: null as unknown as number, n_judged: 20000 }))).toBeNull()
  })
})

describe('gauntletFunnel with a partial search space', () => {
  const digits = (s: string) => s.replace(/[\s  ]/g, '')

  it('prints the corpus and judged counts, and no grid figures', () => {
    const t = gauntletFunnel({ base: 'EMAcross', tf: 'D1', nParams: null, nFilterConfigs: null, nExits: null, nBehaviors: 3931894, nJudged: 20000 }).join(' ')
    expect(digits(t)).toContain('3931894')
    expect(digits(t)).toContain('20000')
    expect(t).not.toContain('jeux de périodes')
    expect(t).not.toContain('un peu plus de')
  })
})
