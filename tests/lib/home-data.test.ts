import { describe, it, expect } from 'vitest'
import { last30Capital, funnelWidths, minutesSince } from '@/lib/home-data'

describe('last30Capital', () => {
  const pts = Array.from({ length: 45 }, (_, i) => ({
    id: `p${i}`, bot_id: 'b', date: `2026-08-${String(i + 1).padStart(2, '0')}`, capital: 1000 + i,
  }))
  it('keeps the last thirty points, in date order', () => {
    const out = last30Capital(pts as never)
    expect(out).toHaveLength(30)
    expect(out[0]).toBe(1015)
    expect(out[29]).toBe(1044)
  })
  it('returns what there is when the history is shorter', () => {
    expect(last30Capital(pts.slice(0, 5) as never)).toEqual([1000, 1001, 1002, 1003, 1004])
  })
})

describe('funnelWidths', () => {
  it('scales on log10 of the count, the first step at 100 %', () => {
    const w = funnelWidths([41333092, 1754244, 3536])
    expect(w[0]).toBe(100)
    expect(w[1]).toBeCloseTo(82, 0)
    expect(w[2]).toBeCloseTo(47, 0)
  })
  it('never draws a bar under 2 % nor over 100 %', () => {
    expect(funnelWidths([1000, 1])[1]).toBe(2)
    expect(funnelWidths([5, 5])[1]).toBe(100)
  })
})

describe('minutesSince', () => {
  it('rounds the age of the freshest sync in minutes', () => {
    const now = new Date('2026-09-25T10:00:00Z')
    expect(minutesSince(['2026-09-25T09:34:10Z', '2026-09-25T09:10:00Z'], now)).toBe(26)
  })
  it('is null without a date', () => {
    expect(minutesSince([null, undefined], new Date())).toBeNull()
  })
})
