// D074: a hand-written bot's backtest segment says what the bot is. The five CME D1 bots
// were tested, not selected (« Exploration », not a GO), tresor-fdm-d1 was REJECTED by its
// own tests; their positions have a fixed size. Engine bots keep their wording.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import BacktestBlock from '@/components/BacktestBlock'
import BacktestSegmentLegend from '@/components/BacktestSegmentLegend'
import type { BacktestSegment } from '@/lib/backtest-segment'

const seg = (over: Partial<BacktestSegment> = {}): BacktestSegment => ({
  slug: 'tresor-fdm-d1', startDate: '2026-01-01', freezeDate: '2026-09-23', replayEnd: '2026-09-23',
  startCapital: 1000,
  points: [{ date: '2026-01-01', capital: 1000 }, { date: '2026-09-23', capital: 994.71 }],
  trades: [{ asset: 'IEF', side: 'long', opened_at: '2026-01-27', closed_at: '2026-01-30',
    entry_price: 1, exit_price: 1, reason: 'ref_exit', pnl: -5.29 }],
  paperScaling: 'additive', verdict: 'rejected', ...over,
})
const txt = (el: React.ReactElement) => render(el).container.textContent!.replace(/\s+/g, ' ')

describe('backtest block of a hand-written bot', () => {
  it('says a rejected strategy was rejected, and why it still runs', () => {
    const t = txt(<BacktestBlock segment={seg()} />)
    expect(t).toMatch(/Rejeté au backtest/)
    expect(t).toMatch(/données où je l.ai testée/)
    expect(t).not.toMatch(/sélection/)
  })

  it('labels an exploration bot as not a GO', () => {
    const t = txt(<BacktestBlock segment={seg({ verdict: 'exploration' })} />)
    expect(t).toMatch(/Exploration/)
    expect(t).not.toMatch(/Rejeté/)
  })

  it('keeps the engine wording for an engine bot', () => {
    const t = txt(<BacktestBlock segment={seg({ verdict: null, paperScaling: 'proportional' })} />)
    expect(t).toMatch(/données de sa sélection/)
    expect(t).not.toMatch(/Exploration|Rejeté/)
  })
})

describe('legend of a hand-written bot', () => {
  it('names the tested data and the fixed position size', () => {
    const t = txt(<BacktestSegmentLegend freezeDate="2026-09-23" simStart="2026-09-24"
      verdict="exploration" paperScaling="additive" />)
    expect(t).toMatch(/données sur lesquelles je l.ai testée/)
    expect(t).toMatch(/même taille/)
    expect(t).not.toMatch(/capital atteint/)
  })
})
