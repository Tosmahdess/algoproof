import { describe, it, expect } from 'vitest'
import { excludeArchived } from '@/lib/cohort'
import type { BotStatus } from '@/lib/types'

const b = (status: BotStatus) => ({ slug: status, status })

describe('excludeArchived', () => {
  it('removes archived bots and keeps paper/live/backtest', () => {
    const out = excludeArchived([b('paper'), b('archived'), b('live'), b('backtest')])
    expect(out.map(x => x.status)).toEqual(['paper', 'live', 'backtest'])
  })

  it('returns the list unchanged when no bot is archived', () => {
    const out = excludeArchived([b('paper'), b('live')])
    expect(out).toHaveLength(2)
  })

  it('returns an empty array when every bot is archived', () => {
    expect(excludeArchived([b('archived'), b('archived')])).toEqual([])
  })
})
