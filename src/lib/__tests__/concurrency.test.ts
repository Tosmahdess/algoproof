import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { mapWithConcurrency } from '@/lib/concurrency'

// /overview, /, /strategies and /strategies/[concept] each fan out one
// getBotWithStats per bot — 3+ Supabase requests apiece, paginated, select('*').
// At ~40 bots that was a burst of ~120 requests on a cold cache; the 75-bot
// armada wave takes it past 350, all fired in the same tick by a bare
// Promise.all. These tests pin the bounded mapper that replaces it.

function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

describe('mapWithConcurrency', () => {
  it('returns results in input order, not completion order', async () => {
    const items = [30, 5, 20, 1]
    const out = await mapWithConcurrency(items, 2, async n => {
      await new Promise(r => setTimeout(r, n))
      return n * 10
    })
    expect(out).toEqual([300, 50, 200, 10])
  })

  it('never runs more than `limit` mappers at once', async () => {
    const LIMIT = 3
    const N = 10
    let inFlight = 0
    let peak = 0
    const gates = Array.from({ length: N }, () => deferred<void>())
    const started: number[] = []

    const run = mapWithConcurrency(Array.from({ length: N }, (_, i) => i), LIMIT, async i => {
      inFlight++
      peak = Math.max(peak, inFlight)
      started.push(i)
      await gates[i].promise
      inFlight--
      return i
    })

    // Let the scheduler start whatever it is going to start before any gate opens.
    await new Promise(r => setTimeout(r, 0))
    expect(started).toHaveLength(LIMIT)

    for (const g of gates) { g.resolve(); await new Promise(r => setTimeout(r, 0)) }
    const out = await run

    expect(out).toHaveLength(N)          // the bound must not drop work
    expect(peak).toBe(LIMIT)             // it saturated, so the measurement is real
    expect(peak).toBeLessThanOrEqual(LIMIT)
  })

  it('rejects on the first failure, like Promise.all', async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async n => {
        if (n === 2) throw new Error('boom 2')
        return n
      }),
    ).rejects.toThrow('boom 2')
  })

  it('handles an empty input without calling the mapper', async () => {
    let calls = 0
    const out = await mapWithConcurrency([], 4, async () => { calls++; return 1 })
    expect(out).toEqual([])
    expect(calls).toBe(0)
  })

  it('a limit larger than the input is the same as Promise.all', async () => {
    const out = await mapWithConcurrency([1, 2], 50, async n => n + 1)
    expect(out).toEqual([2, 3])
  })

  it('refuses a non-positive limit instead of silently serialising or hanging', async () => {
    await expect(mapWithConcurrency([1], 0, async n => n)).rejects.toThrow()
  })
})

describe('the fleet fan-out goes through the bounded mapper', () => {
  // Behaviourally invisible: a bare Promise.all renders the same pages. Only
  // the source shows whether the wave's ~350 requests leave in one tick.
  const src = readFileSync('src/lib/queries.ts', 'utf8')

  it('getAllBotsWithStatsUncached does not fan out with a bare Promise.all', () => {
    const fn = src.slice(src.indexOf('async function getAllBotsWithStatsUncached'))
      .split('\n}\n')[0]
    expect(fn).not.toMatch(/Promise\.all\(\s*bots\.map/)
    expect(fn).toMatch(/mapWithConcurrency\(\s*bots\s*,\s*FLEET_FETCH_CONCURRENCY/)
  })

  it('the bound is a named, exported constant with a sane value', async () => {
    const { FLEET_FETCH_CONCURRENCY } = await import('@/lib/queries')
    expect(FLEET_FETCH_CONCURRENCY).toBeGreaterThanOrEqual(4)
    expect(FLEET_FETCH_CONCURRENCY).toBeLessThanOrEqual(16)
  })
})
