// tests/lib/screening.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase'
import { getProvenanceForBot, count, frDate, ScreeningCampaign } from '@/lib/screening'

// `marginLabel` is gone on purpose (2026-09-12). Its only job was to print a measured value
// next to its BAR ("95,16 pour une barre a 95"), and the bar is one of the judge's classified
// gates, read straight from screening_campaigns.null_bar with the site's publishable key.
// A helper whose only output is a leak has no fixed version, so it left with the sentence.

const mockChain = (data: unknown, error: unknown = null) => {
  const terminal = { data, error }
  const chain: any = {
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(terminal).then(resolve),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(terminal),
  }
  return chain
}

const cell = (o: Partial<ScreeningCampaign> = {}): ScreeningCampaign => ({
  base: 'EMAcross', tf: 'H4', state: 'judged', judged_on: '2026-07-22',
  data_dir: null, n_behaviors: 73770, n_rejected: 73744, n_marginal: 20, n_candidates: 2,
  n_assets: 30, ...o,
})

const CANDIDATE = {
  campaign_id: 7, label: 'A', rank: 1, filter_families: ['tendance'],
  null_pct: 95.16, dd: 19.57, wf_oos: 1.195, pf_net: 1.611,
  trades: 249, assets_go: 6, qualified_assets: [], bot_slug: 'v1-spot', forward_trades: 3,
}

describe('count', () => {
  // Pins the actual codepoint, not a DOM-normalised approximation of it. toLocaleString('fr-FR')
  // groups thousands with a narrow no-break space (U+202F) — a character class of plain ASCII
  // spaces never matches it, which is exactly the bug that shipped in ScreeningDossier.tsx and
  // stayed invisible because screen.getByText()'s whitespace normaliser (\s, which matches
  // U+202F/U+00A0 too) made the broken and the fixed version look identical through the DOM.
  // NARROW_NBSP is written as an escape, on purpose: a literal U+202F in the source survives
  // no round trip through an editor or a rewrite that normalises whitespace (it was lost once,
  // on 2026-09-12, and this test caught it). The escape pins the same codepoint, which is the
  // byte a browser renders.
  const GROUP_SPACE = ' '
const NARROW_NBSP = ' '
  const ASCII_SPACE = ' '

  // Lot 5 of the design audit (2026-09-25): the regular no-break space, the same
  // GROUP_SPACE as display.ts, because Inter renders the narrow one under 2 px.
  it('groups thousands with a regular no-break space, never a narrow or a plain ASCII space', () => {
    const formatted = count(73770)
    expect(formatted).toBe(`73${GROUP_SPACE}770`)
    expect(formatted.includes(NARROW_NBSP)).toBe(false)
    expect(formatted.includes(ASCII_SPACE)).toBe(false)
  })

  it('returns the em-dash placeholder for null', () => {
    expect(count(null)).toBe('—')
  })
})

describe('frDate', () => {
  it('formats a bare YYYY-MM-DD date the French way', () => {
    expect(frDate('2026-07-22')).toBe('22/07/2026')
  })

  it('anchors to noon UTC so no negative-offset timezone rolls the date back a day', () => {
    expect(frDate('2026-01-01')).toBe('01/01/2026')
  })

  it('returns the em-dash placeholder for null', () => {
    expect(frDate(null)).toBe('—')
  })
})

// The leak, as a test. Measured 2026-09-12 with the publishable key: the two base tables
// served null_bar, wf_bar and dd_limit to anyone who asked, and select('*') asked. Migration
// 046 redacts them into two views; this suite pins the client side of that contract.
describe('the screening reads ask for no classified threshold', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reads the redacted views, never the base tables', async () => {
    vi.mocked(supabase.from)
      .mockReturnValueOnce(mockChain(CANDIDATE))
      .mockReturnValueOnce(mockChain(cell()))
    await getProvenanceForBot('v1-spot')
    const tables = vi.mocked(supabase.from).mock.calls.map(c => c[0])
    expect(tables).toEqual(['screening_candidates_public', 'screening_campaigns_public'])
  })

  it('names its columns instead of select(*), and asks for no bar', async () => {
    const candidateChain = mockChain(CANDIDATE)
    const campaignChain = mockChain(cell())
    vi.mocked(supabase.from)
      .mockReturnValueOnce(candidateChain)
      .mockReturnValueOnce(campaignChain)
    await getProvenanceForBot('v1-spot')

    const selects = [
      candidateChain.select.mock.calls[0][0] as string,
      campaignChain.select.mock.calls[0][0] as string,
    ]
    for (const columns of selects) {
      expect(columns).not.toBe('*')
      expect(columns).not.toMatch(/\*/)
      for (const bar of ['null_bar', 'wf_bar', 'dd_limit']) {
        expect(columns, `${bar} must not be requested`).not.toContain(bar)
      }
    }
    // and the measured values the fiche needs are still asked for, or the guard above
    // would pass on an empty column list
    expect(selects[0]).toContain('null_pct')
    expect(selects[0]).toContain('forward_trades')
    expect(selects[1]).toContain('n_behaviors')
  })

  it('the module source carries no bar column at all', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const src = fs.readFileSync(path.resolve(__dirname, '../../src/lib/screening.ts'), 'utf8')
    // Comments may NAME them (the header explains the leak); no code may read them.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    for (const bar of ['null_bar', 'wf_bar', 'dd_limit']) {
      expect(code, `${bar} in code`).not.toContain(bar)
    }
  })
})

describe('getProvenanceForBot', () => {
  beforeEach(() => vi.clearAllMocks())

  it('resolves the campaign + candidate for a bot found by slug', async () => {
    const campaign = cell({ base: 'EMAcross', tf: 'H4' })
    vi.mocked(supabase.from)
      .mockReturnValueOnce(mockChain(CANDIDATE))
      .mockReturnValueOnce(mockChain(campaign))

    const result = await getProvenanceForBot('v1-spot')
    expect(result).toEqual({ campaign, candidate: CANDIDATE })
  })

  it('returns null when the bot has no screening candidate (not screened yet, or another family)', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(mockChain(null))
    const result = await getProvenanceForBot('some-other-bot')
    expect(result).toBeNull()
  })

  it('degrades to null on a Supabase error instead of throwing (view not created yet)', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(mockChain(null, { message: 'relation does not exist' }))
    const result = await getProvenanceForBot('v1-spot')
    expect(result).toBeNull()
  })

  it('degrades to null when the candidate exists but its campaign lookup fails', async () => {
    vi.mocked(supabase.from)
      .mockReturnValueOnce(mockChain(CANDIDATE))
      .mockReturnValueOnce(mockChain(null, { message: 'not found' }))
    const result = await getProvenanceForBot('v1-spot')
    expect(result).toBeNull()
  })

  it('logs the Supabase error before degrading to null on the candidate lookup', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(supabase.from).mockReturnValueOnce(mockChain(null, { message: 'relation does not exist' }))
    const result = await getProvenanceForBot('v1-spot')
    expect(result).toBeNull()
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining('[getProvenanceForBot]'),
      expect.stringContaining('relation does not exist'),
    )
    errSpy.mockRestore()
  })

  it('logs the Supabase error before degrading to null on the campaign lookup', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(supabase.from)
      .mockReturnValueOnce(mockChain(CANDIDATE))
      .mockReturnValueOnce(mockChain(null, { message: 'campaign not found' }))
    const result = await getProvenanceForBot('v1-spot')
    expect(result).toBeNull()
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining('[getProvenanceForBot]'),
      expect.stringContaining('campaign not found'),
    )
    errSpy.mockRestore()
  })

  it('orders by rank ascending and takes one row instead of erroring on multiple candidates', async () => {
    const candidateChain = mockChain(CANDIDATE)
    vi.mocked(supabase.from)
      .mockReturnValueOnce(candidateChain)
      .mockReturnValueOnce(mockChain(cell()))

    await getProvenanceForBot('v1-spot')
    expect(candidateChain.order).toHaveBeenCalledWith('rank', { ascending: true })
    expect(candidateChain.limit).toHaveBeenCalledWith(1)
  })
})
