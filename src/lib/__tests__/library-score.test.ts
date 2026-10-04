import { describe, it, expect } from 'vitest'
import {
  SCORE_MIN_DAYS, studentT90, returnsAtEntry, ideaScore, libraryScores, selectionMean,
} from '@/lib/library-score'

// Lot 2c (validated 01/10, design after Fable 04/10): an idea is ranked on the simulation
// trades of all its launched variants. One observation = one ENTRY DAY of the idea (the
// variants of an idea often take the same trade, and assets entering the same day are not
// independent: a pooled t counted the same day N times, learnings 18/09). Its value = the
// mean gain of that day's trades, each as a fraction of its bot's equity at entry (the
// fiche rescales paper amounts, `buildTimeline` scale, so euros differ page to page).
// Score = one-sided 90 % lower bound of the mean, shown as « gain prudent » per 1 000 €.

const t = (opened: string, closed: string, pnl: number) =>
  ({ opened_at: `${opened}T00:00:00+00:00`, closed_at: `${closed}T00:00:00+00:00`, pnl })

describe('studentT90', () => {
  it('matches the one-sided 90 % Student quantile where an idea can be ranked', () => {
    expect(studentT90(29)).toBeCloseTo(1.3114, 3)
    expect(studentT90(60)).toBeCloseTo(1.2958, 3)
    expect(studentT90(120)).toBeCloseTo(1.2886, 3)
  })
})

describe('returnsAtEntry', () => {
  it('divides each gain by the equity reached when the trade opened', () => {
    const r = returnsAtEntry([t('2026-10-01', '2026-10-02', 100), t('2026-10-03', '2026-10-04', -110)], 1000)
    expect(r.map(x => x.day)).toEqual(['2026-10-01', '2026-10-03'])
    expect(r[0].r).toBeCloseTo(0.1, 12)
    expect(r[1].r).toBeCloseTo(-0.1, 12)          // -110 on 1 100
  })

  it('does not count a trade still open when the next one opened', () => {
    const r = returnsAtEntry([t('2026-10-01', '2026-10-05', 100), t('2026-10-03', '2026-10-04', 50)], 1000)
    expect(r.find(x => x.day === '2026-10-03')!.r).toBeCloseTo(0.05, 12)
  })
})

describe('ideaScore', () => {
  it('is not ranked under 30 entry days, and says how many it has', () => {
    const s = ideaScore(Array.from({ length: 29 }, (_, i) => ({ day: `d${i}`, r: 0.01 })))
    expect(s).toMatchObject({ days: 29, ranked: false })
    expect(s.prudent).toBeNull()
  })

  it('averages the trades of one entry day into ONE observation', () => {
    const obs = [{ day: 'a', r: 0.02 }, { day: 'a', r: 0.04 }, { day: 'b', r: -0.01 }]
    expect(ideaScore(obs).days).toBe(2)
    expect(ideaScore(obs).mean).toBeCloseTo(((0.03 - 0.01) / 2) * 1000, 9)
  })

  it('gives the lower bound per 1 000 € once ranked: mean - t(0.90, n-1) * s / sqrt(n)', () => {
    const obs = Array.from({ length: 30 }, (_, i) => ({ day: `d${i}`, r: i % 2 ? 0.02 : 0 }))
    const s = ideaScore(obs)
    const sd = Math.sqrt((30 * 0.01 ** 2) / 29) * 1000   // values 0 and 20, mean 10
    expect(s.ranked).toBe(true)
    expect(s.mean).toBeCloseTo(10, 9)
    expect(s.prudent).toBeCloseTo(10 - studentT90(29) * sd / Math.sqrt(30), 9)
    expect(SCORE_MIN_DAYS).toBe(30)
  })
})

describe('libraryScores', () => {
  const row = (bot: string, idea: string, opened: string, pnl: number, extra: Partial<{ paper_since: string | null; is_paper: boolean; closed: string | null }> = {}) => ({
    bot_id: bot, idea_key: idea, start_capital: 1000, is_paper: extra.is_paper ?? true,
    paper_since: extra.paper_since ?? null, opened_at: `${opened}T00:00:00+00:00`,
    closed_at: extra.closed === undefined ? `${opened}T12:00:00+00:00` : extra.closed, pnl,
  })

  it('merges the variants of an idea entering on the same day', () => {
    const s = libraryScores([row('a', 'X|H4', '2026-10-01', 10), row('b', 'X|H4', '2026-10-01', 30), row('c', 'Y|D1', '2026-10-01', 5)])
    expect(s.get('X|H4')).toMatchObject({ days: 1, trades: 2 })
    expect(s.get('X|H4')!.mean).toBeCloseTo(20, 9)
    expect(s.get('Y|D1')).toMatchObject({ days: 1, trades: 1 })
  })

  it('keeps simulation trades only: closed, paper, since the launch when the bot has one', () => {
    const s = libraryScores([
      row('a', 'X|H4', '2026-10-01', 10),
      row('a', 'X|H4', '2026-10-02', 10, { closed: null }),
      row('b', 'X|H4', '2026-10-03', 10, { is_paper: false }),
      row('c', 'X|H4', '2026-09-01', 10, { paper_since: '2026-09-15T00:00:00+00:00' }),
      row('c', 'X|H4', '2026-09-20', 10, { paper_since: '2026-09-15T00:00:00+00:00' }),
    ])
    expect(s.get('X|H4')).toMatchObject({ days: 2, trades: 2 })
  })
})

describe('selectionMean', () => {
  const seg = (freezeDate: string, trades: { opened: string; pnl: number }[]) => ({
    freezeDate, startCapital: 1000,
    trades: trades.map(x => ({ opened_at: `${x.opened}T00:00:00+00:00`, closed_at: `${x.opened}T08:00:00+00:00`, pnl: x.pnl })),
  })

  it('pools the selection trades of every variant (up to the freeze), one value per entry day', () => {
    const m = selectionMean([
      seg('2026-08-31', [{ opened: '2026-03-01', pnl: 10 }, { opened: '2026-09-02', pnl: 500 }]),
      seg('2026-08-31', [{ opened: '2026-03-01', pnl: 30 }, { opened: '2026-04-01', pnl: -10 }]),
    ])
    // 03-01: mean(10/1000, 30/1000) = 0.02 ; 04-01: -10/1030 ; the 09-02 replay trade is out
    expect(m).toBeCloseTo(((0.02 + -10 / 1030) / 2) * 1000, 9)
  })

  it('is null without a selection trade', () => {
    expect(selectionMean([])).toBeNull()
    expect(selectionMean([seg('2026-08-31', [{ opened: '2026-09-02', pnl: 5 }])])).toBeNull()
  })
})
