// Refonte « Le registre des décisions », lot 3: the trade register lets a reader redo the
// addition. The cumul is the whole history's, from the starting capital, in close order.
import { describe, it, expect } from 'vitest'
import { breadcrumbName, cumulativeAfterEach, exitReasonWords, sumOfResults } from '@/lib/trade-ledger'
import { simulationOnlyPerf } from '@/lib/simulator'
import type { PerfDaily } from '@/lib/types'

// newest first, as the fiche receives them
const trades = [
  { id: 'c', closed_at: '2026-09-22T10:00:00Z', pnl: 30.22 },
  { id: 'b', closed_at: '2026-09-19T10:00:00Z', pnl: 5.07 },
  { id: 'a', closed_at: '2026-09-15T10:00:00Z', pnl: -10.74 },
]

describe('cumulativeAfterEach', () => {
  it('adds every result to the starting capital, in close order', () => {
    const cumul = cumulativeAfterEach(trades, 1000)
    expect(cumul.get('a')).toBe(989.26)
    expect(cumul.get('b')).toBe(994.33)
    expect(cumul.get('c')).toBe(1024.55)
  })

  it('does not depend on the order it is handed', () => {
    const shuffled = cumulativeAfterEach([trades[1], trades[2], trades[0]], 1000)
    expect([...shuffled.entries()].sort()).toEqual([...cumulativeAfterEach(trades, 1000).entries()].sort())
  })

  it('is computed on the whole history: a subset shown keeps the full cumul', () => {
    const full = cumulativeAfterEach(trades, 1000)
    // a filter leaving only « c » on screen must still read 1 024,55 after it
    expect(full.get('c')).toBe(1024.55)
  })

  it('adds in whole cents, so no float drift over hundreds of trades', () => {
    const many = Array.from({ length: 300 }, (_, i) => ({
      id: String(i), closed_at: new Date(Date.UTC(2026, 0, 1) + i * 3_600_000).toISOString(), pnl: 0.1,
    }))
    expect(cumulativeAfterEach(many, 1000).get('299')).toBe(1030)
  })

  it('keeps the list order for trades closed at the same instant (older one first)', () => {
    const same = [
      { id: 'newer', closed_at: '2026-09-01T10:00:00Z', pnl: 1 },
      { id: 'older', closed_at: '2026-09-01T10:00:00Z', pnl: 2 },
    ]
    const c = cumulativeAfterEach(same, 0)
    expect(c.get('older')).toBe(2)
    expect(c.get('newer')).toBe(3)
  })

  it('an empty history has no cumul', () => {
    expect(cumulativeAfterEach([], 1000).size).toBe(0)
  })
})

describe('sumOfResults', () => {
  it('sums to the cent', () => {
    expect(sumOfResults(trades)).toBe(24.55)
    expect(sumOfResults([])).toBe(0)
  })
})

describe('exitReasonWords', () => {
  it('says the exit in words, whatever code the bot wrote', () => {
    for (const code of ['stop_loss', 'stop_loss_initial', 'SL', 'sl_hit']) expect(exitReasonWords(code)).toBe('Stop')
    for (const code of ['take_profit', 'TP', 'tp_hit']) expect(exitReasonWords(code)).toBe('Objectif')
    expect(exitReasonWords('take_profit_2')).toBe('Objectif 2')
    expect(exitReasonWords('TP3')).toBe('Objectif 3')
    expect(exitReasonWords('trailing_stop')).toBe('Stop suiveur')
  })

  it('never prints a bare code, and « — » when there is none', () => {
    expect(exitReasonWords('some_new_code')).toBe('Some new code')
    expect(exitReasonWords(null)).toBe('—')
  })
})

describe('breadcrumbName', () => {
  it('shortens the name to strategy and timeframe, then the venue', () => {
    expect(breadcrumbName('Croisement EMA H4 Kraken Spot', 'Kraken Spot')).toBe('Croisement EMA H4 · Kraken')
    expect(breadcrumbName('Croisement KAMA H4 Binance Futures n° 2', 'Binance Futures')).toBe('Croisement KAMA H4 n° 2 · Binance')
  })

  it('keeps a name that does not carry its venue', () => {
    expect(breadcrumbName('Delta-neutral carry', 'Hyperliquid')).toBe('Delta-neutral carry')
  })
})

describe('simulationOnlyPerf', () => {
  const pd = (date: string, capital: number, pnl_day: number): PerfDaily =>
    ({ id: date, bot_id: 'b', date, capital, pnl_day, win_rate: null, profit_factor: null })

  it('keeps the freeze day as a flat start, then the simulation', () => {
    const curve = [pd('2026-01-01', 1000, 0), pd('2026-01-31', 1050, 50), pd('2026-02-15', 1060, 10)]
    expect(simulationOnlyPerf(curve, '2026-01-31')).toEqual([pd('2026-01-31', 1050, 0), pd('2026-02-15', 1060, 10)])
  })
})
