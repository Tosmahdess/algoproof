import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
vi.mock('@/lib/supabase-server', () => ({ supabaseServer: { from: (...a: unknown[]) => mockFrom(...a) } }))

import {
  getFleetImpact,
  gatePhrase,
  regimePhrase,
  verdictPhrase,
  pct,
  type FleetImpact,
} from '@/lib/mi-fleet-impact'

// The row actually in mi_fleet_impact on 2026-08-03. Nothing here is invented: the
// drawdowns are fractions as stored, the P&L is the paper replay, and blocked_red is
// genuinely zero, which is the whole reason the prose has to be able to say otherwise.
const MEASURED: FleetImpact = {
  windowDays: 88,
  nPresets: 8,
  nTrades: 254,
  nSmallSample: 4,
  blockedRed: 0,
  ddBaseline: -0.09134498777462241,
  ddBoth: -0.07106051309256545,
  ddConstant: -0.04999105868177934,
  pnlBoth: -216.75554316809033,
  pnlConstant: -199.74893596034735,
}

const ROW = {
  window_start: '2026-05-06T09:15:42Z',
  window_end: '2026-08-03T06:10:02Z',
  n_presets: 8,
  n_trades: 254,
  n_small_sample: 4,
  blocked_red: 0,
  dd_baseline: -0.09134498777462241,
  dd_both: -0.07106051309256545,
  dd_constant: -0.04999105868177934,
  pnl_both: -216.75554316809033,
  pnl_constant: -199.74893596034735,
}

/** Chainable stub ending on maybeSingle(), the shape src/app/api/mi/route.ts uses. */
function chain(result: { data: unknown; error: unknown }) {
  const obj: Record<string, unknown> = {}
  for (const m of ['select', 'order', 'limit', 'eq']) obj[m] = () => obj
  obj.maybeSingle = () => Promise.resolve(result)
  return obj
}

function chainReject(err: Error) {
  const obj: Record<string, unknown> = {}
  for (const m of ['select', 'order', 'limit', 'eq']) obj[m] = () => obj
  obj.maybeSingle = () => Promise.reject(err)
  return obj
}

beforeEach(() => mockFrom.mockReset())

describe('getFleetImpact', () => {
  it('derives the observation window from the row instead of trusting a typed number', async () => {
    mockFrom.mockReturnValue(chain({ data: ROW, error: null }))
    const i = await getFleetImpact()
    expect(mockFrom).toHaveBeenCalledWith('mi_fleet_impact')
    // 2026-05-06T09:15:42Z → 2026-08-03T06:10:02Z is 88 whole days and change.
    expect(i?.windowDays).toBe(88)
    expect(i?.nTrades).toBe(254)
    expect(i?.nSmallSample).toBe(4)
    expect(i?.blockedRed).toBe(0)
    expect(i?.ddConstant).toBeCloseTo(-0.04999, 5)
  })

  it('returns null rather than a stale or invented claim when the query errors', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: { message: 'nope' } }))
    expect(await getFleetImpact()).toBeNull()
  })

  // The client rejecting is the realistic failure (dropped connection), and it is also
  // the only way to test the catch here: vitest 4 reports an error thrown by a SPY as a
  // test failure even when the code under test catches it, so `mockFrom` itself must not
  // be the thrower.
  it('returns null rather than throwing when the client blows up', async () => {
    mockFrom.mockReturnValue(chainReject(new Error('network down')))
    expect(await getFleetImpact()).toBeNull()
  })
})

describe('derived prose', () => {
  it('says nothing was blocked when nothing was blocked', () => {
    expect(gatePhrase(MEASURED)).toMatch(/rien bloqué/)
    expect(regimePhrase(MEASURED)).toMatch(/pas été traversé/)
  })

  // The bug this test exists for: prose frozen next to a live number. With one block,
  // "rien bloqué" becomes a visible lie sitting beside the counter that contradicts it.
  it('says what it blocked when it blocked something', () => {
    const withBlocks = { ...MEASURED, blockedRed: 3 }
    expect(gatePhrase(withBlocks)).not.toMatch(/rien bloqué/)
    expect(gatePhrase(withBlocks)).toMatch(/3 signaux/)
    expect(regimePhrase(withBlocks)).toBe('')
  })

  it('handles the singular', () => {
    expect(gatePhrase({ ...MEASURED, blockedRed: 1 })).toMatch(/1 signal\b/)
  })

  // Same hazard on the conclusion: it is only true while the control wins.
  it('concedes when the control wins, and says so when it does not', () => {
    expect(verdictPhrase(MEASURED)).toMatch(/frein constant aurait mieux fait/)
    const matrixWins = { ...MEASURED, ddConstant: -0.09, pnlConstant: -400 }
    expect(verdictPhrase(matrixWins)).not.toMatch(/aurait mieux fait/)
  })

  // A tie is not a win for the control: the concession is owed only when the flat cut
  // beat the weather on BOTH axes, which is what the published claim says.
  it('does not concede on a tie or a split result', () => {
    const tie = { ...MEASURED, ddConstant: MEASURED.ddBoth, pnlConstant: MEASURED.pnlBoth }
    expect(verdictPhrase(tie)).not.toMatch(/aurait mieux fait/)
    const split = { ...MEASURED, pnlConstant: -400 } // shallower DD, worse P&L
    expect(verdictPhrase(split)).not.toMatch(/aurait mieux fait/)
  })

  it('formats fractions as French percents, one decimal', () => {
    expect(pct(-0.07106)).toBe('−7,1 %')
    expect(pct(-0.04999)).toBe('−5,0 %')
  })
})

describe('voice', () => {
  const ALL = [
    gatePhrase(MEASURED),
    gatePhrase({ ...MEASURED, blockedRed: 3 }),
    regimePhrase(MEASURED),
    verdictPhrase(MEASURED),
    verdictPhrase({ ...MEASURED, ddConstant: -0.09, pnlConstant: -400 }),
  ].join('\n')

  it('stays first person singular and never speaks as a team', () => {
    expect(/\b(nous|notre|nos)\b/i.test(ALL), ALL).toBe(false)
    expect(ALL).toMatch(/\bje\b/i)
  })

  it('uses no em or en dash', () => {
    expect(ALL.includes('—'), 'em dash').toBe(false)
    expect(ALL.includes('–'), 'en dash').toBe(false)
  })

  it('leaks no machine identifier into published prose', () => {
    for (const token of ['blocked_red', 'dd_both', 'dd_constant', 'pnl_both', 'BOTH_RED', 'enforced', 'shadow', 'mi_fleet_impact']) {
      expect(ALL.includes(token), token).toBe(false)
    }
  })
})
