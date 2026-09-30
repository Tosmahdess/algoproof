// D074 (Fable triage, user 29/09): a paper bot without a backtest segment keeps its
// ledger curve, on an axis that starts on 1 January like every other bot's, with NOTHING
// drawn before its launch (a flat 1 000 EUR line would read as data).
import { describe, it, expect } from 'vitest'
import { padFrom } from '@/components/EquityCurve'
import type { PerfDaily } from '@/lib/types'

const pd = (date: string, capital: number): PerfDaily => ({
  id: date, bot_id: 'b', date, capital, pnl_day: 0, win_rate: null, profit_factor: null,
})

describe('padFrom', () => {
  it('adds empty days from the axis start to the day before the first data point', () => {
    const rows = padFrom([pd('2026-01-04', 1010), pd('2026-01-05', 1005)], '2026-01-01')
    expect(rows.map(r => r.date)).toEqual(
      ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05'])
    expect(rows.map(r => r.capital)).toEqual([null, null, null, 1010, 1005])
  })

  it('leaves data that already starts on or before the axis start untouched', () => {
    const data = [pd('2025-12-30', 1000)]
    expect(padFrom(data, '2026-01-01')).toEqual(data)
    expect(padFrom([], '2026-01-01')).toEqual([])
  })
})
