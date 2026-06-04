import { describe, it, expect, vi } from 'vitest'
import { paginateAll } from '@/lib/paginate'

describe('paginateAll', () => {
  it('fetches across multiple pages until a short page', async () => {
    const data = [0, 1, 2, 3, 4]
    const fetchPage = vi.fn(async (from: number, to: number) => data.slice(from, to + 1))
    const all = await paginateAll(fetchPage, 2)
    expect(all).toEqual([0, 1, 2, 3, 4])
    // [0,1] full -> [2,3] full -> [4] short (stop). 3 calls.
    expect(fetchPage).toHaveBeenCalledTimes(3)
  })

  it('returns a single page when data is shorter than pageSize', async () => {
    const fetchPage = vi.fn(async () => [1, 2])
    const all = await paginateAll(fetchPage, 10)
    expect(all).toEqual([1, 2])
    expect(fetchPage).toHaveBeenCalledTimes(1)
  })

  it('handles a total that is an exact multiple of pageSize (needs trailing empty fetch)', async () => {
    const pages: number[][] = [[1, 2], [3, 4], []]
    const fetchPage = vi.fn(async (from: number) => pages[from / 2] ?? [])
    const all = await paginateAll(fetchPage, 2)
    expect(all).toEqual([1, 2, 3, 4])
    expect(fetchPage).toHaveBeenCalledTimes(3)
  })
})
