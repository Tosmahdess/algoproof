// tests/lib/screening.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase'
import {
  cellLabel, marginLabel, isDossierUnlocked, getProvenanceForBot,
  TF_ORDER, ScreeningCampaign, ScreeningState,
} from '@/lib/screening'

const mockChain = (data: unknown, error: unknown = null) => {
  const terminal = { data, error }
  const chain: any = {
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(terminal).then(resolve),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(terminal),
  }
  return chain
}

const cell = (o: Partial<ScreeningCampaign> = {}): ScreeningCampaign => ({
  base: 'EMAcross', tf: 'H4', state: 'judged', judged_on: '2026-07-22',
  data_dir: null, n_behaviors: 73770, n_rejected: 73744, n_marginal: 20, n_candidates: 2,
  null_bar: 95, ...o,
})

describe('TF_ORDER', () => {
  it('runs from the slowest to the fastest so D1 reads first', () => {
    expect(TF_ORDER).toEqual(['D1', 'H4', 'H1', 'M30', 'M15', 'M5'])
  })
})

describe('cellLabel', () => {
  it('states the outcome for a closed campaign with survivors', () => {
    expect(cellLabel(cell())).toBe('2 en observation')
  })

  it('names a zero as a result, never as an absence', () => {
    expect(cellLabel(cell({ n_candidates: 0 }))).toBe('clos · résultat négatif')
  })

  it('distinguishes running, queued and untested', () => {
    expect(cellLabel(cell({ state: 'running' }))).toBe('en cours')
    expect(cellLabel(cell({ state: 'queued' }))).toBe('en file')
    expect(cellLabel(cell({ state: 'never' }))).toBe('jamais testé')
  })

  it('never uses the internal verdict vocabulary', () => {
    const all = (['judged', 'running', 'queued', 'never'] as ScreeningState[])
      .map((s) => cellLabel(cell({ state: s }))).join(' ')
    expect(all).not.toMatch(/GO_PAPER|MARGINAL|NO_GO|strong|survivant/i)
  })
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

describe('isDossierUnlocked', () => {
  it('unlocks everything until a membership system exists', () => {
    expect(isDossierUnlocked('EMAcross', 'H4')).toBe(true)
    expect(isDossierUnlocked('Donchian', 'M5')).toBe(true)
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
})
