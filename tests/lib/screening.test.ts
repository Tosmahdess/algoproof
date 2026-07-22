// tests/lib/screening.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase'
import {
  marginLabel, getProvenanceForBot, count, frDate, ScreeningCampaign,
} from '@/lib/screening'

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
  n_assets: 30, null_bar: 95, ...o,
})

describe('marginLabel', () => {
  it('flags a value that only just clears its bar', () => {
    const m = marginLabel(95.16, 95, 'pct')
    expect(m.tight).toBe(true)
    expect(m.text).toBe('95,16 pour une barre à 95')
  })

  it('does not flag a comfortable margin', () => {
    expect(marginLabel(98.66, 95, 'pct').tight).toBe(false)
  })

  it('treats a limit-style bar (lower is better) correctly', () => {
    expect(marginLabel(19.57, 20, 'pct').tight).toBe(true)
    expect(marginLabel(16.81, 20, 'pct').tight).toBe(false)
  })

  it('uses the French decimal comma', () => {
    expect(marginLabel(1.195, 1.15, 'ratio').text).toBe('1,195 pour une barre à 1,15')
  })
})

describe('count', () => {
  // Pins the actual codepoint, not a DOM-normalised approximation of it. toLocaleString('fr-FR')
  // groups thousands with a narrow no-break space (U+202F) — a character class of plain ASCII
  // spaces never matches it, which is exactly the bug that shipped in ScreeningDossier.tsx and
  // stayed invisible because screen.getByText()'s whitespace normaliser (\s, which matches
  // U+202F/U+00A0 too) made the broken and the fixed version look identical through the DOM.
  // NARROW_NBSP below holds the literal U+202F character itself, typed directly into the
  // source (not a JS unicode escape sequence) - asserting on the string directly is the
  // only way to actually pin the exact byte a browser renders.
  const NARROW_NBSP = ' '
  const ASCII_SPACE = ' '

  it('groups thousands with a narrow no-break space, never a plain ASCII space', () => {
    const formatted = count(73770)
    expect(formatted).toBe(`73${NARROW_NBSP}770`)
    expect(formatted).toContain(NARROW_NBSP)
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

describe('getProvenanceForBot', () => {
  beforeEach(() => vi.clearAllMocks())

  it('resolves the campaign + candidate for a bot found by slug', async () => {
    const candidate = { campaign_id: 7, label: 'A', rank: 1, filter_families: ['tendance'],
      null_pct: 95.16, dd: 19.57, dd_limit: 20, wf_oos: 1.195, wf_bar: 1.15, pf_net: 1.611,
      trades: 249, assets_go: 6, qualified_assets: [], bot_slug: 'v1-spot', forward_trades: 3 }
    const campaign = cell({ base: 'EMAcross', tf: 'H4' })
    vi.mocked(supabase.from)
      .mockReturnValueOnce(mockChain(candidate))
      .mockReturnValueOnce(mockChain(campaign))

    const result = await getProvenanceForBot('v1-spot')
    expect(result).toEqual({ campaign, candidate })
  })

  it('returns null when the bot has no screening candidate (not screened yet, or another family)', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(mockChain(null))
    const result = await getProvenanceForBot('some-other-bot')
    expect(result).toBeNull()
  })

  it('degrades to null on a Supabase error instead of throwing (tables not created yet)', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(mockChain(null, { message: 'relation does not exist' }))
    const result = await getProvenanceForBot('v1-spot')
    expect(result).toBeNull()
  })

  it('degrades to null when the candidate exists but its campaign lookup fails', async () => {
    const candidate = { campaign_id: 7, label: 'A', rank: 1, filter_families: [], null_pct: 95,
      dd: 10, dd_limit: 20, wf_oos: 1.2, wf_bar: 1.15, pf_net: 1.5, trades: 100, assets_go: 3,
      qualified_assets: [], bot_slug: 'v1-spot', forward_trades: 0 }
    vi.mocked(supabase.from)
      .mockReturnValueOnce(mockChain(candidate))
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
    const candidate = { campaign_id: 7, label: 'A', rank: 1, filter_families: [], null_pct: 95,
      dd: 10, dd_limit: 20, wf_oos: 1.2, wf_bar: 1.15, pf_net: 1.5, trades: 100, assets_go: 3,
      qualified_assets: [], bot_slug: 'v1-spot', forward_trades: 0 }
    vi.mocked(supabase.from)
      .mockReturnValueOnce(mockChain(candidate))
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
    const candidate = { campaign_id: 7, label: 'A', rank: 1, filter_families: [], null_pct: 95,
      dd: 10, dd_limit: 20, wf_oos: 1.2, wf_bar: 1.15, pf_net: 1.5, trades: 100, assets_go: 3,
      qualified_assets: [], bot_slug: 'v1-spot', forward_trades: 0 }
    const candidateChain = mockChain(candidate)
    vi.mocked(supabase.from)
      .mockReturnValueOnce(candidateChain)
      .mockReturnValueOnce(mockChain(cell()))

    await getProvenanceForBot('v1-spot')
    expect(candidateChain.order).toHaveBeenCalledWith('rank', { ascending: true })
    expect(candidateChain.limit).toHaveBeenCalledWith(1)
  })
})
